"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, MessageSquare, AlertCircle, HelpCircle, Loader2, Send, CheckCircle2, Clock } from "lucide-react";
import { listenToEvent, joinParticipant, updateParticipantPresence, submitResponse, isMockMode } from "@/lib/db";
import { EventData, QuestionData } from "@/lib/types";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface PageProps {
  params: Promise<{ eventCode: string }>;
}

export default function ParticipantPage({ params }: PageProps) {
  const router = useRouter();
  const { eventCode } = use(params);

  // Connection & Event States
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventError, setEventError] = useState(false);

  // Participant Session States
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantIdentifier, setParticipantIdentifier] = useState<string | null>(null);
  
  // Input Flow State
  const [identityInput, setIdentityInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  
  // Question & Submission States
  const [activeQuestion, setActiveQuestion] = useState<QuestionData | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [responseAnswer, setResponseAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmittedActive, setHasSubmittedActive] = useState(false);
  const [countdownTime, setCountdownTime] = useState<number>(0);
  const [localActiveQuestionId, setLocalActiveQuestionId] = useState<string | null>(null);

  // 1. Initialise session from LocalStorage & Listen to Event Doc
  useEffect(() => {
    // Restore session if exists
    const storedPartId = localStorage.getItem(`hive_pid_${eventCode}`);
    const storedIdent = localStorage.getItem(`hive_pident_${eventCode}`);
    if (storedPartId && storedIdent) {
      setParticipantId(storedPartId);
      setParticipantIdentifier(storedIdent);
    }

    // Subscribe to Event Document
    const unsubscribe = listenToEvent(eventCode, (data) => {
      setLoadingEvent(false);
      if (data) {
        setEventData(data);
      } else {
        setEventError(true);
      }
    });

    return () => unsubscribe();
  }, [eventCode]);

  // 2. Fetch Active Question details when activeQuestionId changes
  useEffect(() => {
    if (!eventData || !eventData.activeQuestionId) {
      setActiveQuestion(null);
      setHasSubmittedActive(false);
      setResponseAnswer("");
      return;
    }

    const qid = eventData.activeQuestionId;
    
    // Check if we've already answered this question locally
    const answeredKey = `hive_answered_${eventCode}_${qid}`;
    if (localStorage.getItem(answeredKey)) {
      setHasSubmittedActive(true);
    } else {
      setHasSubmittedActive(false);
    }

    async function fetchQuestion() {
      setLoadingQuestion(true);
      try {
        if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "mock-api-key") {
          // Mock mode: retrieve from mock data store
          const storedQs = localStorage.getItem(`hive_questions_${eventCode}`);
          const questions = storedQs ? JSON.parse(storedQs) : [];
          const matched = questions.find((q: any) => q.id === qid);
          setActiveQuestion(matched || null);
        } else if (db) {
          const qSnap = await getDoc(doc(db, "events", eventCode, "questions", qid));
          if (qSnap.exists()) {
            setActiveQuestion(qSnap.data() as QuestionData);
          }
        }
      } catch (err) {
        console.error("Error fetching question:", err);
      } finally {
        setLoadingQuestion(false);
      }
    }

    fetchQuestion();
  }, [eventData?.activeQuestionId, eventCode]);

  // 2.5 Transition Countdown logic for launched questions
  useEffect(() => {
    if (eventData?.activeQuestionId && eventData.activeQuestionStatus === "launched") {
      if (eventData.activeQuestionId !== localActiveQuestionId) {
        // Trigger 5-second countdown!
        setCountdownTime(5);
        const timer = setInterval(() => {
          setCountdownTime((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              setLocalActiveQuestionId(eventData.activeQuestionId);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(timer);
      }
    } else {
      setLocalActiveQuestionId(eventData?.activeQuestionId || null);
      setCountdownTime(0);
    }
  }, [eventData?.activeQuestionId, eventData?.activeQuestionStatus, localActiveQuestionId]);

  // 3. Setup Presence System (Heartbeat)
  useEffect(() => {
    if (!participantId || !eventData) return;

    // Set online status immediately
    updateParticipantPresence(eventCode, participantId, true);

    // Keep updating lastSeen every 30 seconds
    const interval = setInterval(() => {
      updateParticipantPresence(eventCode, participantId, true);
    }, 30000);

    // Set offline on tab close / cleanup
    const handleBeforeUnload = () => {
      updateParticipantPresence(eventCode, participantId, false);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updateParticipantPresence(eventCode, participantId, false);
    };
  }, [participantId, eventData, eventCode]);

  // 4. Handle Joining Event
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const ident = identityInput.trim();
    if (!ident) return;

    setIsJoining(true);
    const pid = await joinParticipant(eventCode, ident);
    setIsJoining(false);

    if (pid) {
      localStorage.setItem(`hive_pid_${eventCode}`, pid);
      localStorage.setItem(`hive_pident_${eventCode}`, ident);
      setParticipantId(pid);
      setParticipantIdentifier(ident);
    } else {
      alert("Could not join event. Please check internet connection.");
    }
  };

  // 5. Handle Submitting Question Response
  const handleResponseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestion || !participantId || !participantIdentifier || isSubmitting) return;

    const answer = responseAnswer.trim();
    if (!answer) return;

    setIsSubmitting(true);
    const success = await submitResponse(
      eventCode,
      activeQuestion.id,
      participantId,
      participantIdentifier,
      answer
    );
    setIsSubmitting(false);

    if (success) {
      // Mark as answered in localStorage to lock submissions
      localStorage.setItem(`hive_answered_${eventCode}_${activeQuestion.id}`, "true");
      setHasSubmittedActive(true);
    } else {
      alert("Submission failed. Please try again.");
    }
  };

  // 6. Check Active state configurations
  const isQuestionActive = eventData?.activeQuestionStatus === "launched";
  const isQuestionPaused = eventData?.activeQuestionStatus === "paused";
  const isQuestionEnded = eventData?.activeQuestionStatus === "ended" || eventData?.activeQuestionStatus === "hidden";

  return (
    <AnimatedBackground>
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        {/* Subtle Event Header in wait list */}
        {eventData && participantId && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
            <h3 className="text-xl font-black text-white tracking-wider">
              HIVE<span className="text-yellow-300">Live</span>
            </h3>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>Event: {eventCode}</span>
            </div>
          </div>
        )}

        <div className="w-full max-w-md z-10">
          {loadingEvent && (
            <GlassCard className="text-center p-8">
              <Loader2 className="h-10 w-10 text-yellow-300 animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-bold">Connecting to Event...</h3>
            </GlassCard>
          )}

          {eventError && !loadingEvent && (
            <GlassCard className="text-center p-8 border-red-500/20">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-2xl font-black">Event Not Found</h3>
              <p className="text-zinc-300 text-sm mt-2">
                This event code is invalid or has ended. Double check the URL link and try again.
              </p>
              
              {isMockMode() && (
                <div className="mt-4 flex flex-col gap-1.5 text-xs text-yellow-300 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20 text-left leading-normal">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" /> Demo Mode Notice
                  </span>
                  <span>
                    This website is running in Demo Mode (no Firebase credentials set). Local events are only accessible on the device/browser tab they were created on.
                  </span>
                </div>
              )}

              <Button
                onClick={() => router.push("/")}
                className="mt-6 bg-white hover:bg-zinc-100 text-zinc-950 font-bold"
              >
                Go to Homepage
              </Button>
            </GlassCard>
          )}

          {eventData && !loadingEvent && (
            <AnimatePresence mode="wait">
              {/* STAGE 1: Identity Screen */}
              {!participantId && (
                <motion.div
                  key="identity"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard className="p-8">
                    {eventData.activityStarted === true ? (
                      <div className="text-center py-4">
                        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4 animate-pulse" />
                        <h2 className="text-2xl font-black text-white">Lobby is Locked</h2>
                        <p className="text-zinc-300 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
                          This activity has already started. New participants are no longer allowed to join this session.
                        </p>
                        <Button
                          onClick={() => router.push("/")}
                          className="mt-6 bg-white hover:bg-zinc-100 text-zinc-950 font-bold"
                        >
                          Go to Homepage
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="text-center mb-6">
                          <h2 className="text-3xl font-black text-white">Join Event</h2>
                          <p className="text-zinc-300 text-sm mt-1">
                            Please enter your details requested by the host.
                          </p>
                        </div>

                        <form onSubmit={handleJoin} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-200">
                              {eventData.participantIdentifierConfig.label}
                            </label>
                            <Input
                              type={eventData.participantIdentifierConfig.type}
                              placeholder={eventData.participantIdentifierConfig.placeholder}
                              value={identityInput}
                              onChange={(e) => setIdentityInput(e.target.value)}
                              className="glass-input h-12 text-lg rounded-xl"
                              required
                              autoFocus
                            />
                          </div>

                          <Button
                            type="submit"
                            disabled={isJoining || !identityInput.trim()}
                            className="w-full h-12 bg-yellow-300 hover:bg-yellow-400 text-zinc-950 font-bold rounded-xl text-lg flex items-center justify-center gap-2"
                          >
                            {isJoining ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Joining...
                              </>
                            ) : (
                              <>Join Event</>
                            )}
                          </Button>
                        </form>
                      </>
                    )}
                  </GlassCard>
                </motion.div>
              )}

              {/* STAGE 2: Waiting Screen */}
              {participantId && (!activeQuestion || localActiveQuestionId !== activeQuestion.id) && countdownTime === 0 && (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                    <div className="relative mb-6">
                      {/* Pulse Ring */}
                      <span className="absolute inset-0 rounded-full bg-yellow-300/20 animate-ping" />
                      <div className="relative p-4 rounded-full bg-white/10 border border-white/10 text-yellow-300">
                        <Sparkles className="h-10 w-10" />
                      </div>
                    </div>
                    
                    <h2 className="text-3xl font-extrabold text-white">Joined Event!</h2>
                    <p className="text-zinc-200 mt-2 font-medium max-w-xs mx-auto animate-pulse">
                      {eventData.activityStarted !== true 
                        ? "Waiting for the host to start..."
                        : "Waiting for the first question..."}
                    </p>
                    <p className="text-xs text-zinc-400 mt-6 font-mono">
                      Logged in as: <span className="text-yellow-300">{participantIdentifier}</span>
                    </p>
                  </GlassCard>
                </motion.div>
              )}

              {/* Countdown overlay screen */}
              {countdownTime > 0 && (
                <motion.div
                  key="countdown"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <GlassCard className="p-8 text-center flex flex-col items-center justify-center min-h-[300px] border-yellow-300/30">
                    <div className="relative mb-6">
                      <span className="absolute -inset-4 rounded-full bg-yellow-300/10 animate-pulse" />
                      <div className="text-6xl font-black text-yellow-300 w-24 h-24 rounded-full border-4 border-yellow-300 flex items-center justify-center">
                        {countdownTime}
                      </div>
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest animate-pulse">Get Ready!</h2>
                    <p className="text-zinc-400 mt-2 text-sm">
                      Question is revealing in a moment...
                    </p>
                  </GlassCard>
                </motion.div>
              )}

              {/* STAGE 3: Question Display / Submission Screen */}
              {participantId && activeQuestion && localActiveQuestionId === activeQuestion.id && countdownTime === 0 && (
                <motion.div
                  key="question"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  className="space-y-4"
                >
                  {isQuestionEnded ? (
                    <GlassCard className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                      <div className="relative mb-6">
                        <span className="absolute inset-0 rounded-full bg-yellow-300/20 animate-ping" />
                        <div className="relative p-4 rounded-full bg-white/10 border border-white/10 text-yellow-300">
                          <Loader2 className="h-10 w-10 animate-spin" />
                        </div>
                      </div>
                      <h2 className="text-3xl font-extrabold text-white">Round Ended</h2>
                      <p className="text-zinc-200 mt-2 font-medium max-w-xs mx-auto animate-pulse">
                        Waiting for next question...
                      </p>
                    </GlassCard>
                  ) : (
                    <>
                      {/* Submission Flow */}
                      {!hasSubmittedActive && (
                        <GlassCard className="p-8">
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold w-fit mb-4">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>OPEN RESPONSE</span>
                          </div>

                          <h3 className="text-2xl md:text-3xl font-black text-white leading-tight mb-6">
                            {activeQuestion.text}
                          </h3>

                          <form onSubmit={handleResponseSubmit} className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-zinc-300">Your Answer</label>
                              <Textarea
                                placeholder="Type your response here..."
                                value={responseAnswer}
                                onChange={(e) => setResponseAnswer(e.target.value)}
                                disabled={isQuestionPaused || isQuestionEnded}
                                className="glass-input min-h-[160px] text-lg rounded-xl p-4 resize-none focus-visible:ring-2 focus-visible:ring-yellow-300"
                                required
                              />
                            </div>

                            {isQuestionPaused && (
                              <div className="flex items-center gap-2 text-yellow-300 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20 text-sm">
                                <AlertCircle className="h-4 w-4 shrink-0 animate-pulse" />
                                <span>The host has paused this round. Submissions are temporarily disabled.</span>
                              </div>
                            )}

                            <Button
                              type="submit"
                              disabled={isSubmitting || !responseAnswer.trim() || isQuestionPaused || isQuestionEnded}
                              className="w-full h-12 bg-yellow-300 hover:bg-yellow-400 text-zinc-950 font-bold rounded-xl text-lg flex items-center justify-center gap-2"
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  Submit Response
                                  <Send className="h-4 w-4" />
                                </>
                              )}
                            </Button>
                          </form>
                        </GlassCard>
                      )}

                      {/* Submission Success Screen */}
                      {hasSubmittedActive && (
                        <GlassCard className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                          <div className="p-4 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 mb-6">
                            <CheckCircle2 className="h-12 w-12" />
                          </div>
                          
                          <h3 className="text-3xl font-black text-white">Submission received!</h3>
                          <p className="text-zinc-200 mt-2 font-medium max-w-xs mx-auto">
                            Please wait for the next round to start.
                          </p>
                          
                          <div className="mt-8 border-t border-white/10 pt-4 w-full text-left">
                            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2">Your Submitted Answer</p>
                            <p className="text-sm text-zinc-300 italic bg-black/20 p-3 rounded-lg border border-white/5">
                              "{responseAnswer || "Submitted answer"}"
                            </p>
                          </div>
                        </GlassCard>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </AnimatedBackground>
  );
}
