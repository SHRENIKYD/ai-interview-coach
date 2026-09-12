export type Difficulty = "Easy" | "Medium" | "Hard";
export type Role = "interviewer" | "candidate";
export type Band = "Excellent" | "Good" | "Adequate" | "Weak";
export type Result = "Pass" | "Fail";

export interface Message {
  role: Role;
  content: string;
}

export interface TurnResponse {
  topic: string;
  difficulty: Difficulty;
  message: string;
  is_complete: boolean;
  questions_asked: number;
  messages: Message[];
}

export interface Report {
  topic: string;
  difficulty: Difficulty;
  score: number;
  band: Band;
  result: Result;
  strengths: string[];
  weaknesses: string[];
  topics_to_revise: string[];
  verdict: string;
}

export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "");

/** An error carrying a message that is safe to put in front of a user. */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Can't reach the server. Make sure the backend is running on " +
        `${API_BASE} and try again.`,
    );
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Leave data null; handled below.
  }

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : `The server returned an error (${response.status}). Please try again.`;
    throw new ApiError(message, response.status);
  }

  if (data === null) {
    throw new ApiError("The server sent back an unreadable response.", response.status);
  }

  return data as T;
}

export function startInterview(topic: string, difficulty: Difficulty) {
  return post<TurnResponse>("/api/interview/start", { topic, difficulty });
}

export function sendAnswer(
  topic: string,
  difficulty: Difficulty,
  messages: Message[],
  answer: string,
) {
  return post<TurnResponse>("/api/interview/answer", {
    topic,
    difficulty,
    messages,
    answer,
  });
}

export function fetchReport(
  topic: string,
  difficulty: Difficulty,
  messages: Message[],
) {
  return post<Report>("/api/interview/report", { topic, difficulty, messages });
}
