"""Request/response schemas. These double as the input validation layer."""

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator

MAX_TOPIC_LEN = 120
MAX_ANSWER_LEN = 4000
MAX_HISTORY = 100


class Difficulty(str, Enum):
    easy = "Easy"
    medium = "Medium"
    hard = "Hard"


class Role(str, Enum):
    interviewer = "interviewer"
    candidate = "candidate"


class Message(BaseModel):
    role: Role
    content: str = Field(min_length=1, max_length=MAX_ANSWER_LEN)


class _TopicMixin(BaseModel):
    topic: str = Field(min_length=2, max_length=MAX_TOPIC_LEN)
    difficulty: Difficulty

    @field_validator("topic")
    @classmethod
    def _clean_topic(cls, value: str) -> str:
        topic = " ".join(value.split())
        if not topic:
            raise ValueError("Topic cannot be blank.")
        return topic


class StartRequest(_TopicMixin):
    pass


class AnswerRequest(_TopicMixin):
    messages: list[Message] = Field(min_length=1, max_length=MAX_HISTORY)
    answer: str = Field(min_length=1, max_length=MAX_ANSWER_LEN)

    @field_validator("answer")
    @classmethod
    def _clean_answer(cls, value: str) -> str:
        answer = value.strip()
        if not answer:
            raise ValueError("Answer cannot be blank.")
        return answer


class ReportRequest(_TopicMixin):
    messages: list[Message] = Field(min_length=1, max_length=MAX_HISTORY)


class TurnResponse(BaseModel):
    """One interviewer turn, plus the running transcript so the client can send it back."""

    topic: str
    difficulty: Difficulty
    message: str
    is_complete: bool
    questions_asked: int
    messages: list[Message]


class ReportResponse(BaseModel):
    topic: str
    difficulty: Difficulty
    score: int = Field(ge=0, le=100)
    band: Literal["Excellent", "Good", "Adequate", "Weak"]
    result: Literal["Pass", "Fail"]
    strengths: list[str]
    weaknesses: list[str]
    topics_to_revise: list[str]
    verdict: str


class HealthResponse(BaseModel):
    status: Literal["ok"]
    model: str
    groq_key_configured: bool
