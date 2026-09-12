"""FastAPI app exposing the three actions the frontend needs: start, answer, report.

There is no database. The client holds the transcript and sends it back on every call.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import get_settings
from .interviewer import InterviewerError, build_report, count_questions, next_turn
from .models import (
    AnswerRequest,
    HealthResponse,
    Message,
    ReportRequest,
    ReportResponse,
    Role,
    StartRequest,
    TurnResponse,
)

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s  %(levelname)-8s %(name)s  %(message)s"
)
logger = logging.getLogger("interview_coach")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("=" * 62)
    logger.info("  AI Interview Coach - backend ready")
    logger.info("  Docs:   /docs        (on whichever host:port uvicorn reports below)")
    logger.info("  Health: /api/health")
    logger.info("  Model:  %s", settings.groq_model)
    logger.info("  CORS:   %s", ", ".join(settings.allowed_origins))
    if settings.has_api_key:
        logger.info("  Groq key: found")
    else:
        logger.warning("  Groq key: MISSING - copy .env.example to .env and add GROQ_API_KEY")
    logger.info("=" * 62)
    yield
    logger.info("AI Interview Coach backend shutting down.")


app = FastAPI(
    title="AI Interview Coach",
    description="Conducts a technical interview one question at a time and scores it.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().allowed_origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# --- Error handling: friendly JSON instead of stack traces -------------------


def _error(status_code: int, message: str, detail: object = None) -> JSONResponse:
    body: dict = {"error": message}
    if detail is not None:
        body["detail"] = detail
    return JSONResponse(status_code=status_code, content=body)


@app.exception_handler(InterviewerError)
async def handle_interviewer_error(_: Request, exc: InterviewerError) -> JSONResponse:
    return _error(exc.status_code, str(exc))


@app.exception_handler(RequestValidationError)
async def handle_validation_error(
    _: Request, exc: RequestValidationError
) -> JSONResponse:
    problems = []
    for err in exc.errors():
        field = ".".join(str(part) for part in err.get("loc", ()) if part != "body")
        problems.append(f"{field or 'request'}: {err.get('msg', 'is invalid')}")
    return _error(
        422,
        "That request didn't look right: " + "; ".join(problems[:4]),
        problems,
    )


@app.exception_handler(StarletteHTTPException)
async def handle_http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    return _error(exc.status_code, str(exc.detail))


@app.exception_handler(Exception)
async def handle_unexpected_error(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error: %s", exc)
    return _error(
        500, "Something went wrong on our side. Please try that again."
    )


# --- Routes -----------------------------------------------------------------


@app.get("/api/health", response_model=HealthResponse, tags=["meta"])
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        model=settings.groq_model,
        groq_key_configured=settings.has_api_key,
    )


@app.post("/api/interview/start", response_model=TurnResponse, tags=["interview"])
async def start_interview(payload: StartRequest) -> TurnResponse:
    """I give a topic and difficulty, I get the first question."""
    text, is_complete = next_turn(payload.topic, payload.difficulty, [])
    messages = [Message(role=Role.interviewer, content=text)]
    return TurnResponse(
        topic=payload.topic,
        difficulty=payload.difficulty,
        message=text,
        is_complete=is_complete,
        questions_asked=count_questions(messages),
        messages=messages,
    )


@app.post("/api/interview/answer", response_model=TurnResponse, tags=["interview"])
async def answer_question(payload: AnswerRequest) -> TurnResponse:
    """I send my answer, I get the interviewer's next message and whether it's over."""
    messages = list(payload.messages)
    messages.append(Message(role=Role.candidate, content=payload.answer))

    text, is_complete = next_turn(payload.topic, payload.difficulty, messages)
    messages.append(Message(role=Role.interviewer, content=text))

    return TurnResponse(
        topic=payload.topic,
        difficulty=payload.difficulty,
        message=text,
        is_complete=is_complete,
        questions_asked=count_questions(messages),
        messages=messages,
    )


@app.post("/api/interview/report", response_model=ReportResponse, tags=["interview"])
async def interview_report(payload: ReportRequest) -> ReportResponse:
    """I send the finished transcript, I get the scored report."""
    report = build_report(payload.topic, payload.difficulty, payload.messages)
    return ReportResponse(**report)
