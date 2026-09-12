# AI Interview Coach

Type a technical topic, pick Easy / Medium / Hard, and an AI interviewer interviews you
one question at a time. It follows up when your answer is half-right, moves on when it's
wrong, and never gives you the answer. When it has seen enough it ends the interview on
its own — then you get a report: a score out of 100, what you did well, what you got
wrong, topics to revise, an overall verdict, and Pass or Fail.

```
ai-interview-coach/
├── frontend/   Next.js 16 · React 19 · TypeScript · Tailwind v4
└── backend/    FastAPI · any OpenAI-compatible provider (OpenRouter or Groq)
```

## Setup

You need an API key from one provider:

- **OpenRouter** (default) — <https://openrouter.ai/keys>
- **Groq** — <https://console.groq.com/keys>

Copy the example file and fill in your key:

```bash
cp backend/.env.example backend/.env
```

For OpenRouter, set `AI_PROVIDER=openrouter` and paste your key into
`OPENROUTER_API_KEY`. For Groq, set `AI_PROVIDER=groq` and use `GROQ_API_KEY`.
`backend/.env` is gitignored, so the key stays on your machine.

Everything else is already installed — the Python virtualenv is at `backend/.venv` and
`frontend/node_modules` is populated. To rebuild them from scratch:

```bash
python -m venv backend/.venv && backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
```

```bash
cd frontend && npm install
```

## Run it

Two terminals.

**Backend** (port 8000):

```bash
cd backend && .venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

**Frontend** (port 3000):

```bash
cd frontend && npm run dev
```

Then open <http://localhost:3000>.

On macOS or Linux the backend command is `.venv/bin/python -m uvicorn app.main:app --reload --port 8000`.

## How it works

There is no database. The frontend holds the transcript and sends it back on every call,
so the backend is stateless.

| Method | Endpoint                 | Does                                                          |
| ------ | ------------------------ | ------------------------------------------------------------- |
| `GET`  | `/api/health`            | Liveness, active provider and model, whether a key is present  |
| `POST` | `/api/interview/start`   | Topic + difficulty → the first question                        |
| `POST` | `/api/interview/answer`  | Transcript + your answer → next message, and `is_complete`     |
| `POST` | `/api/interview/report`  | Full transcript → the scored report                            |

Interactive API docs run at <http://127.0.0.1:8000/docs>.

### Providers

Both OpenRouter and Groq speak the OpenAI chat-completions protocol, so a single client
in `backend/app/interviewer.py` handles either. `backend/app/config.py` maps
`AI_PROVIDER` to a base URL, a key variable and a default model:

| `AI_PROVIDER` | Base URL                        | Key variable         | Default model                       |
| ------------- | ------------------------------- | -------------------- | ----------------------------------- |
| `openrouter`  | `https://openrouter.ai/api/v1`  | `OPENROUTER_API_KEY` | `meta-llama/llama-3.3-70b-instruct` |
| `groq`        | `https://api.groq.com/openai/v1`| `GROQ_API_KEY`       | `llama-3.3-70b-versatile`           |

`AI_MODEL` overrides the default. Any other OpenAI-compatible endpoint works by adding an
entry to `PROVIDERS`.

### The interviewer

`backend/app/interviewer.py` holds both prompts.

- **Difficulty** shapes the questions: Easy is definitions and recall, Medium is applied
  problems, Hard is trade-offs and system thinking.
- **One question per turn.** A strong answer gets a brief acknowledgement and a move to a
  different aspect; a half-right answer gets one probing follow-up with nothing revealed;
  a wrong answer gets a one-line note and a move on. The prompt explicitly forbids
  restating, confirming or correcting answer content, and forbids smuggling the answer
  into the next question — without those rules the model drifts into tutoring.
- **The interviewer decides when to stop.** It appends a sentinel token
  (`[[END_OF_INTERVIEW]]`) to its closing message, which the backend strips before the
  text reaches you and turns into `is_complete: true`. A hard cap of 12 questions
  guarantees an interview always terminates.

### Scoring

The reporter returns JSON. Score bands are 85+ excellent, 70–84 good, 55–69 adequate,
below 55 weak. **The band and Pass/Fail are derived from the score in Python, not asked
of the model**, so they can never contradict it. Pass is 55 and above.

## Configuration

| Variable              | Where                 | Default                                       |
| --------------------- | --------------------- | --------------------------------------------- |
| `AI_PROVIDER`         | `backend/.env`        | `openrouter`                                  |
| `OPENROUTER_API_KEY`  | `backend/.env`        | *(required for OpenRouter)*                   |
| `GROQ_API_KEY`        | `backend/.env`        | *(required for Groq)*                         |
| `AI_MODEL`            | `backend/.env`        | provider default (see table above)            |
| `ALLOWED_ORIGINS`     | `backend/.env`        | `http://localhost:3000,http://127.0.0.1:3000` |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | `http://127.0.0.1:8000`                       |

## Troubleshooting

**"OpenRouter is not configured."** — `backend/.env` is missing or has no key for the
selected provider. Add it and restart the backend. Check with
<http://127.0.0.1:8000/api/health>, which reports `provider`, `model` and
`api_key_configured`.

**"Can't reach the server."** — The backend isn't running, or it's on a different port
than `NEXT_PUBLIC_API_URL` expects.

**"… rejected our API key."** — The key is present but wrong, revoked, or out of credit.
