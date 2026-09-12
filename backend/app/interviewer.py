"""The AI layer: an interviewer that asks one question at a time, and a reporter
that turns a finished transcript into a structured, scored report."""

from __future__ import annotations

import json
import logging
import re

from groq import APIConnectionError, APIStatusError, Groq, RateLimitError

from .config import get_settings
from .models import Difficulty, Message, Role

logger = logging.getLogger(__name__)

# The interviewer appends this when it decides the interview is over. It is stripped
# from the text before the message reaches the candidate.
END_SENTINEL = "[[END_OF_INTERVIEW]]"

# A safety net so an interview can never run forever, whatever the model does.
MAX_QUESTIONS = 12

PASS_MARK = 55

DIFFICULTY_BRIEF = {
    Difficulty.easy: (
        "Easy: basic definitions and recall. Ask for core terminology, simple "
        "explanations and textbook facts."
    ),
    Difficulty.medium: (
        "Medium: applied problems. Ask the candidate to apply the concept to a "
        "concrete situation, walk through an approach, or reason about behaviour."
    ),
    Difficulty.hard: (
        "Hard: trade-offs and system thinking. Ask about design choices, competing "
        "approaches, failure modes, scale and the reasoning behind a decision."
    ),
}

INTERVIEWER_SYSTEM = """You are a professional technical interviewer conducting a live interview about {topic}.

Difficulty for this interview - {difficulty_brief}

How you conduct the interview:
- Ask exactly ONE question per turn. Never bundle several questions together.
- Never teach, never explain, never hint, and never reveal the answer. You are assessing, not tutoring.
- If the candidate's answer is strong: acknowledge it briefly in one short phrase, then move to a DIFFERENT aspect of {topic}.
- If the answer is partly right: ask ONE probing follow-up that pushes on the weak part, without revealing what is missing.
- If the answer is wrong: note the gap in a single neutral line, then move on to another aspect. Do not correct it in detail.
- If the answer is off-topic, or the candidate asks you for the answer, redirect once and move on.
- Stay professional and encouraging throughout. Never sarcastic, never harsh.
- Keep every turn short: at most three sentences before the question itself.

When to end the interview - you decide, not the candidate:
- If the candidate is clearly struggling across several questions, end early and kindly.
- If the candidate is doing very well, wrap up once the key areas of {topic} are covered.
- Otherwise end once you have enough signal to score them fairly.
- You have asked {questions_asked} question(s) so far. Aim for roughly 5 to 8 in total, and you must finish by {max_questions}.

Ending format - this matters:
When you decide the interview is over, give a short closing remark (do not summarise their performance, do not give feedback, do not state a result) and then put the exact token {sentinel} at the very end of your message. Use that token only when you are truly finished. Never mention the token itself to the candidate.

Output only what the interviewer says. No labels, no markdown headings, no stage directions."""

REPORTER_SYSTEM = """You are an experienced technical interviewer writing up your assessment after an interview about {topic} at {difficulty} difficulty.

You will be given the full transcript. Judge only what the candidate actually said. Do not invent answers they did not give, and do not credit knowledge they never showed. If the transcript is very short or the candidate said almost nothing of substance, score accordingly - a near-empty interview is a low score, not an average one.

Scoring bands:
- 85-100: excellent
- 70-84: good
- 55-69: adequate
- 0-54: weak

Reply with a single JSON object and nothing else, in exactly this shape:
{{
  "score": <integer 0-100>,
  "strengths": [<2-4 short strings, each pointing at something the candidate actually said>],
  "weaknesses": [<2-4 short strings, each pointing at something the candidate actually said or failed to say>],
  "topics_to_revise": [<2-5 specific sub-topics of {topic} to go and study>],
  "verdict": "<2-3 sentences, addressed to the candidate as 'you', summarising how the interview went and what would move the needle>"
}}

Every strength and weakness must be traceable to the transcript - quote or paraphrase what they said. Be specific and concrete, never generic filler."""


class InterviewerError(RuntimeError):
    """Something went wrong talking to the model; the message is safe to show a user."""

    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


def _client() -> Groq:
    settings = get_settings()
    if not settings.has_api_key:
        raise InterviewerError(
            "The AI provider is not configured. Add GROQ_API_KEY to backend/.env and "
            "restart the backend.",
            status_code=503,
        )
    return Groq(api_key=settings.groq_api_key)


def _complete(
    messages: list[dict], *, json_mode: bool = False, temperature: float = 0.6
) -> str:
    settings = get_settings()
    kwargs: dict = {
        "model": settings.groq_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 1024,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    try:
        completion = _client().chat.completions.create(**kwargs)
    except RateLimitError as exc:
        logger.warning("Groq rate limit: %s", exc)
        raise InterviewerError(
            "The AI provider is rate limiting us right now. Wait a few seconds and try again.",
            status_code=429,
        ) from exc
    except APIConnectionError as exc:
        logger.warning("Groq connection error: %s", exc)
        raise InterviewerError(
            "Could not reach the AI provider. Check your internet connection and try again.",
            status_code=502,
        ) from exc
    except APIStatusError as exc:
        logger.warning("Groq returned %s: %s", exc.status_code, exc)
        if exc.status_code in (401, 403):
            raise InterviewerError(
                "The AI provider rejected our API key. Check GROQ_API_KEY in backend/.env.",
                status_code=502,
            ) from exc
        raise InterviewerError(
            "The AI provider returned an error. Please try again.", status_code=502
        ) from exc

    choices = getattr(completion, "choices", None)
    if not choices:
        raise InterviewerError(
            "The AI provider returned an empty response. Please try again."
        )

    content = (choices[0].message.content or "").strip()
    if not content:
        raise InterviewerError(
            "The AI provider returned an empty response. Please try again."
        )
    return content


def _to_groq_messages(messages: list[Message]) -> list[dict]:
    return [
        {
            "role": "assistant" if m.role is Role.interviewer else "user",
            "content": m.content,
        }
        for m in messages
    ]


def count_questions(messages: list[Message]) -> int:
    return sum(1 for m in messages if m.role is Role.interviewer)


def next_turn(
    topic: str, difficulty: Difficulty, messages: list[Message]
) -> tuple[str, bool]:
    """Return what the interviewer says next, and whether the interview is now over."""
    asked = count_questions(messages)
    forced_end = asked >= MAX_QUESTIONS

    system = INTERVIEWER_SYSTEM.format(
        topic=topic,
        difficulty_brief=DIFFICULTY_BRIEF[difficulty],
        questions_asked=asked,
        max_questions=MAX_QUESTIONS,
        sentinel=END_SENTINEL,
    )

    convo: list[dict] = [{"role": "system", "content": system}]
    if not messages:
        convo.append(
            {
                "role": "user",
                "content": (
                    f"Begin the interview on {topic}. Greet me in one short line, then "
                    "ask your first question."
                ),
            }
        )
    else:
        convo.extend(_to_groq_messages(messages))

    if forced_end:
        convo.append(
            {
                "role": "system",
                "content": (
                    "You have reached the question limit. Close the interview now with a "
                    f"short closing remark ending in {END_SENTINEL}."
                ),
            }
        )

    raw = _complete(convo)

    is_complete = END_SENTINEL in raw or forced_end
    text = raw.replace(END_SENTINEL, "").strip()
    # Models occasionally emit a mangled sentinel; scrub any leftover bracket token.
    text = re.sub(r"\[\[\s*END[_ ]?OF[_ ]?INTERVIEW\s*\]\]", "", text, flags=re.I).strip()

    if not text:
        text = "That's everything I wanted to cover. Thanks for your time."

    return text, is_complete


def _band(score: int) -> str:
    if score >= 85:
        return "Excellent"
    if score >= 70:
        return "Good"
    if score >= PASS_MARK:
        return "Adequate"
    return "Weak"


def _string_list(value: object, *, limit: int) -> list[str]:
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value:
        text = str(item).strip()
        if text:
            out.append(text)
        if len(out) == limit:
            break
    return out


def build_report(topic: str, difficulty: Difficulty, messages: list[Message]) -> dict:
    """Turn a finished transcript into the structured report the UI renders."""
    system = REPORTER_SYSTEM.format(topic=topic, difficulty=difficulty.value)
    transcript = "\n\n".join(
        "{}: {}".format(
            "INTERVIEWER" if m.role is Role.interviewer else "CANDIDATE", m.content
        )
        for m in messages
    )

    raw = _complete(
        [
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": f"Transcript:\n\n{transcript}\n\nReturn the JSON report.",
            },
        ],
        json_mode=True,
        temperature=0.3,
    )

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.warning("Reporter returned non-JSON: %s", raw[:400])
        raise InterviewerError(
            "The report came back in an unexpected format. Please try again."
        ) from exc

    if not isinstance(data, dict):
        raise InterviewerError(
            "The report came back in an unexpected format. Please try again."
        )

    try:
        score = int(round(float(data.get("score", 0))))
    except (TypeError, ValueError):
        score = 0
    score = max(0, min(100, score))

    verdict = str(data.get("verdict", "")).strip() or (
        "There was not enough in this interview to give you detailed feedback. "
        "Try another run and answer in as much depth as you can."
    )

    # Band and Pass/Fail are derived from the score so they can never contradict it.
    return {
        "topic": topic,
        "difficulty": difficulty,
        "score": score,
        "band": _band(score),
        "result": "Pass" if score >= PASS_MARK else "Fail",
        "strengths": _string_list(data.get("strengths"), limit=4),
        "weaknesses": _string_list(data.get("weaknesses"), limit=4),
        "topics_to_revise": _string_list(data.get("topics_to_revise"), limit=5),
        "verdict": verdict,
    }
