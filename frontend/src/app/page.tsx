"use client";

import { useCallback, useState } from "react";
import InterviewScreen from "@/components/InterviewScreen";
import ReportScreen from "@/components/ReportScreen";
import StartScreen from "@/components/StartScreen";
import {
  ApiError,
  fetchReport,
  sendAnswer,
  startInterview,
  type Difficulty,
  type Message,
  type Report,
} from "@/lib/api";

type Phase = "start" | "interview" | "report";

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("start");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [messages, setMessages] = useState<Message[]>([]);

  const [isStarting, setIsStarting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isWrappingUp, setIsWrappingUp] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  // The answer that failed to send, kept so "Try again" can resend it.
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);

  const loadReport = useCallback(
    async (forTopic: string, forDifficulty: Difficulty, transcript: Message[]) => {
      setIsWrappingUp(false);
      setIsReporting(true);
      setError(null);
      try {
        setReport(await fetchReport(forTopic, forDifficulty, transcript));
      } catch (caught) {
        setReport(null);
        setError(messageFor(caught));
      } finally {
        setIsReporting(false);
      }
    },
    [],
  );

  const handleStart = useCallback(
    async (nextTopic: string, nextDifficulty: Difficulty) => {
      setIsStarting(true);
      setError(null);
      try {
        const turn = await startInterview(nextTopic, nextDifficulty);
        setTopic(turn.topic);
        setDifficulty(turn.difficulty);
        setMessages(turn.messages);
        setReport(null);
        setPendingAnswer(null);
        setPhase("interview");

        // Vanishingly rare, but the interviewer is allowed to end on turn one.
        if (turn.is_complete) {
          setPhase("report");
          void loadReport(turn.topic, turn.difficulty, turn.messages);
        }
      } catch (caught) {
        setError(messageFor(caught));
      } finally {
        setIsStarting(false);
      }
    },
    [loadReport],
  );

  const submitAnswer = useCallback(
    async (answer: string) => {
      setIsThinking(true);
      setError(null);
      setPendingAnswer(answer);

      // Show the candidate's message straight away; the server echoes back the
      // authoritative transcript, which replaces this optimistic copy.
      const optimistic: Message[] = [
        ...messages,
        { role: "candidate", content: answer },
      ];
      setMessages(optimistic);

      try {
        const turn = await sendAnswer(topic, difficulty, messages, answer);
        setMessages(turn.messages);
        setPendingAnswer(null);

        if (turn.is_complete) {
          setIsWrappingUp(true);
          setPhase("report");
          void loadReport(topic, difficulty, turn.messages);
        }
      } catch (caught) {
        setMessages(messages); // roll back the optimistic append
        setError(messageFor(caught));
      } finally {
        setIsThinking(false);
      }
    },
    [difficulty, loadReport, messages, topic],
  );

  const retryAnswer = useCallback(() => {
    if (pendingAnswer) void submitAnswer(pendingAnswer);
  }, [pendingAnswer, submitAnswer]);

  const restart = useCallback(() => {
    setPhase("start");
    setTopic("");
    setMessages([]);
    setReport(null);
    setError(null);
    setPendingAnswer(null);
    setIsWrappingUp(false);
  }, []);

  const endEarly = useCallback(() => {
    if (messages.length === 0) {
      restart();
      return;
    }
    setPhase("report");
    void loadReport(topic, difficulty, messages);
  }, [difficulty, loadReport, messages, restart, topic]);

  if (phase === "interview") {
    return (
      <InterviewScreen
        topic={topic}
        difficulty={difficulty}
        messages={messages}
        isThinking={isThinking}
        isWrappingUp={isWrappingUp}
        error={error}
        onSend={(answer) => void submitAnswer(answer)}
        onRetry={retryAnswer}
        onQuit={endEarly}
      />
    );
  }

  if (phase === "report") {
    return (
      <ReportScreen
        topic={topic}
        difficulty={difficulty}
        report={report}
        isLoading={isReporting || isWrappingUp}
        error={error}
        onRetry={() => void loadReport(topic, difficulty, messages)}
        onRestart={restart}
      />
    );
  }

  return (
    <StartScreen
      onStart={(nextTopic, nextDifficulty) =>
        void handleStart(nextTopic, nextDifficulty)
      }
      isStarting={isStarting}
      error={error}
      onDismissError={() => setError(null)}
    />
  );
}
