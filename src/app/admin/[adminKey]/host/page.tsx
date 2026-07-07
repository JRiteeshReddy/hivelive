"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, Sparkles, Plus, Play, Pause, Square, Eye, EyeOff, 
  Settings, Award, QrCode, Copy, Check, BarChart2, ShieldAlert,
  ChevronRight, Volume2, UserCheck, CheckSquare, XCircle, Star, Sparkle,
  AlertCircle
} from "lucide-react";
import { QrCodeDisplay } from "@/components/QrCodeDisplay";
import { 
  listenToEvent, listenToQuestions, listenToParticipants, 
  listenToResponses, addQuestion, launchQuestion, 
  updateActiveQuestionStatus, revealResponse, revealResponseIdentity,
  isMockMode
} from "@/lib/db";
import { EventData, QuestionData, ParticipantData, ResponseData } from "@/lib/types";

interface PageProps {
  params: Promise<{ adminKey: string }>;
}

export default function HostDashboardPage({ params }: PageProps) {
  const router = useRouter();
  const { adminKey } = use(params);

  // Core Data States
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [loading, setLoading] = useState(true);

  // Local UI States
  const [newQuestionText, setNewQuestionText] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState<"participant" | "admin" | null>(null);

  // Authenticate & Subscribe
  useEffect(() => {
    let unsubscribeEvent = () => {};
    let unsubscribeQuestions = () => {};
    let unsubscribeParticipants = () => {};
    let unsubscribeResponses = () => {};

    // Restore eventCode from localStorage
    const savedCode = localStorage.getItem("hive_active_event_code");
    const savedKey = localStorage.getItem("hive_active_admin_key");
    
    if (!savedCode || savedKey !== adminKey) {
      // Find event by admin key
      setLoading(true);
      import("@/lib/db").then(async ({ findEventByAdminKey }) => {
        const code = await findEventByAdminKey(adminKey);
        if (code) {
          localStorage.setItem(`hive_admin_auth_${code}`, adminKey);
          localStorage.setItem("hive_active_event_code", code);
          localStorage.setItem("hive_active_admin_key", adminKey);
          setupSubscriptions(code);
        } else {
          setLoading(false);
        }
      });
    } else {
      setupSubscriptions(savedCode);
    }

    function setupSubscriptions(code: string) {
      unsubscribeEvent = listenToEvent(code, (data) => {
        if (data) {
          setEventData(data);
        }
        setLoading(false);
      });

      unsubscribeQuestions = listenToQuestions(code, (data) => {
        setQuestions(data);
      });

      unsubscribeParticipants = listenToParticipants(code, (data) => {
        setParticipants(data);
      });

      unsubscribeResponses = listenToResponses(code, (data) => {
        setResponses(data);
      });
    }

    return () => {
      unsubscribeEvent();
      unsubscribeQuestions();
      unsubscribeParticipants();
      unsubscribeResponses();
    };
  }, [adminKey]);

  // URLs
  const getParticipantUrl = () => {
    if (typeof window === "undefined" || !eventData) return "";
    return `${window.location.protocol}//${window.location.host}/join/${eventData.eventCode}`;
  };

  const getAdminUrl = () => {
    if (typeof window === "undefined" || !eventData) return "";
    return `${window.location.protocol}//${window.location.host}/admin/join/${adminKey}`;
  };

  const copyLink = async (type: "participant" | "admin") => {
    const url = type === "participant" ? getParticipantUrl() : getAdminUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(type);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  // Add a new question
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !eventData) return;
    
    await addQuestion(eventData.eventCode, newQuestionText.trim(), questions.length + 1);
    setNewQuestionText("");
  };

  // Launch Question
  const handleLaunch = async (questionId: string) => {
    if (!eventData) return;
    await launchQuestion(eventData.eventCode, questionId);
  };

  // Manage Question Status
  const handleStatusChange = async (status: "waiting" | "launched" | "paused" | "ended" | "hidden") => {
    if (!eventData) return;
    await updateActiveQuestionStatus(eventData.eventCode, status, eventData.activeQuestionId);
  };

  // Stats Calculations
  const activeQuestionText = questions.find((q) => q.id === eventData?.activeQuestionId)?.text || "None";
  const onlineCount = participants.filter((p) => p.isOnline).length;
  const activeCount = participants.filter((p) => {
    // Online within last 60 seconds
    const diff = new Date().getTime() - new Date(p.lastSeenAt).getTime();
    return p.isOnline || diff < 60000;
  }).length;
  
  const currentResponses = responses.filter((r) => r.questionId === eventData?.activeQuestionId);
  const currentSubmittedCount = currentResponses.length;

  const totalQuestionsCompleted = questions.filter((q) => q.status === "completed").length;
  const totalApproved = responses.filter((r) => r.moderationStatus === "approved").length;
  const totalRejected = responses.filter((r) => r.moderationStatus === "rejected").length;

  // Host Queue (Moderator approved responses)
  const approvedResponses = responses.filter((r) => r.moderationStatus === "approved");

  if (loading) {
    return (
      <AnimatedBackground>
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="animate-spin w-12 h-12 border-4 border-yellow-300 border-t-transparent rounded-full" />
        </div>
      </AnimatedBackground>
    );
  }

  if (!eventData) {
    return (
      <AnimatedBackground>
        <div className="flex-grow flex items-center justify-center p-4">
          <GlassCard className="p-8 text-center max-w-sm">
            <ShieldAlert className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-white">Invalid Admin Dashboard</h3>
            <p className="text-zinc-300 text-sm mt-2">
              We couldn't authenticate you for this session. Please use the original admin link generated.
            </p>
            <Button onClick={() => router.push("/")} className="mt-6 bg-white hover:bg-zinc-100 text-zinc-950 font-bold">
              Go to Home
            </Button>
          </GlassCard>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      {/* Top Navbar */}
      <nav className="glass-panel w-full border-b border-white/10 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black text-white tracking-wider cursor-pointer" onClick={() => router.push("/")}>
            HIVE<span className="text-yellow-300">Live</span>
          </h2>
          <span className="px-2 py-0.5 rounded bg-yellow-300/10 border border-yellow-300/20 text-xs font-bold text-yellow-300">
            HOST DECK
          </span>
          <span className="text-zinc-400 text-sm font-mono font-bold bg-black/35 px-2.5 py-1 rounded-lg border border-white/5">
            CODE: {eventData.eventCode}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setShowQrModal(true)}
            variant="outline"
            className="border-white/10 hover:bg-white/10 text-white flex items-center gap-2"
          >
            <QrCode className="h-4 w-4" />
            QR Code
          </Button>

          <Button
            onClick={() => copyLink("participant")}
            variant="outline"
            className="border-white/10 hover:bg-white/10 text-white flex items-center gap-2"
          >
            {copiedLink === "participant" ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            Join Link
          </Button>

          <Button
            onClick={() => copyLink("admin")}
            variant="outline"
            className="border-white/10 hover:bg-white/10 text-white flex items-center gap-2"
          >
            {copiedLink === "admin" ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            Admin Link
          </Button>

          <Button
            onClick={() => router.push(`/admin/${adminKey}/presentation`)}
            className="bg-yellow-300 hover:bg-yellow-400 text-zinc-950 font-bold"
          >
            Presentation Mode
          </Button>

          <Button
            onClick={() => router.push(`/admin/${adminKey}/moderator`)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
          >
            Moderator Panel
          </Button>
        </div>
      </nav>

      {isMockMode() && (
        <div className="w-full max-w-7xl mx-auto px-6 pt-6 z-10 shrink-0">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-sm leading-normal">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-grow">
              <span className="font-bold block text-yellow-300">Running in Demo Mode (Local Sync Only)</span>
              <span className="text-zinc-300 text-xs mt-1 block leading-relaxed">
                All data is currently being saved locally in this browser. 
                <strong> Participants on other devices (like mobile phones) will not be able to join this event.</strong>
                <br />
                If you have configured your environment variables on Vercel and enabled Firestore Database, click the button below to retry connection.
              </span>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 border-yellow-500/30 hover:bg-yellow-500/20 text-yellow-300 text-xs h-7 px-3 font-semibold"
                onClick={() => {
                  localStorage.removeItem("hive_force_local_mode");
                  window.location.reload();
                }}
              >
                Retry Live Connection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Workspace */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl w-full mx-auto z-10 items-start">
        {/* Left Column: Controls & Questions (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Question Control Panel */}
          <GlassCard className="border-yellow-300/20">
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <span className="text-xs font-bold text-yellow-300 uppercase tracking-widest">Active Question</span>
                <h3 className="text-2xl font-black text-white mt-1 leading-snug">
                  {eventData.activeQuestionId ? activeQuestionText : "No Question Launched"}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold font-mono">
                Status:{" "}
                <span
                  className={`capitalize font-bold ${
                    eventData.activeQuestionStatus === "launched" ? "text-green-400" : "text-yellow-400"
                  }`}
                >
                  {eventData.activeQuestionStatus}
                </span>
              </div>
            </div>

            {eventData.activeQuestionId && (
              <div className="flex flex-wrap gap-2.5 pt-4 border-t border-white/10">
                {eventData.activeQuestionStatus !== "launched" && (
                  <Button
                    onClick={() => handleLaunch(eventData.activeQuestionId!)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" /> Resume / Launch
                  </Button>
                )}

                {eventData.activeQuestionStatus === "launched" && (
                  <Button
                    onClick={() => handleStatusChange("paused")}
                    className="bg-yellow-500 hover:bg-yellow-600 text-zinc-950 font-bold flex items-center gap-2"
                  >
                    <Pause className="h-4 w-4" /> Pause
                  </Button>
                )}

                <Button
                  onClick={() => handleStatusChange("ended")}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2"
                >
                  <Square className="h-4 w-4" /> End Round
                </Button>

                <Button
                  onClick={() => handleStatusChange("hidden")}
                  variant="outline"
                  className="border-white/10 hover:bg-white/10 text-white flex items-center gap-2"
                >
                  <EyeOff className="h-4 w-4" /> Hide from Screen
                </Button>
              </div>
            )}
          </GlassCard>

          {/* Question List and Queue builder */}
          <GlassCard>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-yellow-300" />
              Manage Q&A Queue
            </h3>

            {/* Form to add question */}
            <form onSubmit={handleAddQuestion} className="flex gap-2 mb-6">
              <Input
                type="text"
                placeholder="Invent the funniest startup..."
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                className="glass-input flex-grow rounded-xl h-11"
                required
              />
              <Button type="submit" className="bg-yellow-300 hover:bg-yellow-400 text-zinc-950 font-bold px-5">
                Add Q
              </Button>
            </form>

            {/* List of questions */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {questions.length === 0 ? (
                <p className="text-zinc-400 text-sm text-center py-6">No questions added yet. Add your first question above!</p>
              ) : (
                questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                      eventData.activeQuestionId === q.id
                        ? "bg-yellow-300/10 border-yellow-300/40"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-zinc-300">
                        Q{idx + 1}
                      </span>
                      <p className="font-bold text-white text-sm md:text-base leading-snug">{q.text}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {q.status === "completed" && (
                        <span className="text-xs text-zinc-400 font-bold bg-white/5 border border-white/5 px-2 py-1 rounded">
                          Completed
                        </span>
                      )}
                      
                      {eventData.activeQuestionId !== q.id && q.status !== "completed" && (
                        <Button
                          onClick={() => handleLaunch(q.id)}
                          size="sm"
                          className="bg-yellow-300 hover:bg-yellow-400 text-zinc-950 font-bold flex items-center gap-1"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          Launch
                        </Button>
                      )}

                      {eventData.activeQuestionId === q.id && (
                        <span className="text-xs text-green-400 font-bold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded animate-pulse">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Live Statistics Panel */}
          <GlassCard>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-yellow-300" />
              Live Statistics
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-wide">Participants Online</p>
                <p className="text-3xl font-black text-white mt-1">{onlineCount}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-wide">Responses Submitted</p>
                <p className="text-3xl font-black text-yellow-300 mt-1">
                  {currentSubmittedCount} <span className="text-xs text-zinc-400">({(onlineCount > 0 ? (currentSubmittedCount / onlineCount) * 100 : 0).toFixed(0)}%)</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-wide font-medium">Questions Completed</p>
                <p className="text-3xl font-black text-white mt-1">{totalQuestionsCompleted}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center col-span-1">
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-wide">Approved Cards</p>
                <p className="text-3xl font-black text-green-400 mt-1">{totalApproved}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center col-span-1">
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-wide">Rejected Cards</p>
                <p className="text-3xl font-black text-red-400 mt-1">{totalRejected}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center col-span-1">
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-wide">Active Round</p>
                <p className="text-3xl font-black text-white mt-1">
                  {questions.findIndex((q) => q.id === eventData.activeQuestionId) !== -1
                    ? `Q#${questions.findIndex((q) => q.id === eventData.activeQuestionId) + 1}`
                    : "None"}
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Host Queue / Presentation Control (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <GlassCard className="border-orange-500/20 min-h-[500px] flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-orange-400" />
                Host Queue <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold">{approvedResponses.length}</span>
              </h3>
              <span className="text-xs text-zinc-400">Ready to Reveal</span>
            </div>

            {/* Approved queue items */}
            <div className="space-y-4 flex-grow overflow-y-auto max-h-[600px] pr-2">
              {approvedResponses.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-2xl flex-grow mt-10">
                  <Award className="h-10 w-10 text-zinc-500 mb-3" />
                  <p className="text-zinc-400 text-sm font-medium">Host Queue is empty.</p>
                  <p className="text-zinc-500 text-xs mt-1">Moderator-approved cards appear here before being projected.</p>
                </div>
              ) : (
                approvedResponses.map((res) => (
                  <div
                    key={res.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col gap-3 ${
                      res.isRevealed 
                        ? "bg-orange-500/10 border-orange-500/40" 
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {/* Header: tags / star */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1 flex-wrap">
                        {res.isStarred && (
                          <span className="p-1 rounded bg-yellow-400/20 text-yellow-400">
                            <Star className="h-3 w-3 fill-current" />
                          </span>
                        )}
                        {res.tags.map((tag) => (
                          <span key={tag} className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/10 text-white border border-white/5 capitalize">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {new Date(res.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-white font-bold leading-relaxed">{res.answer}</p>

                    {/* Identity if revealed */}
                    <div className="flex items-center gap-1 text-xs font-semibold text-zinc-300">
                      <span>Identifier:</span>
                      <span className={`font-bold font-mono px-1.5 py-0.5 rounded text-xs ${
                        res.isIdentityRevealed 
                          ? "bg-yellow-300/20 text-yellow-300 border border-yellow-300/30" 
                          : "bg-black/30 text-zinc-400 border border-white/5"
                      }`}>
                        {res.participantIdentifier}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2 border-t border-white/5">
                      <Button
                        onClick={() => revealResponse(eventData.eventCode, res.id, !res.isRevealed)}
                        size="sm"
                        variant={res.isRevealed ? "default" : "outline"}
                        className={`flex-grow font-bold gap-1 text-xs h-9 ${
                          res.isRevealed 
                            ? "bg-orange-500 hover:bg-orange-600 text-white" 
                            : "border-white/10 hover:bg-white/10 text-white"
                        }`}
                      >
                        {res.isRevealed ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            Hide Answer
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            Reveal Answer
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={() => revealResponseIdentity(eventData.eventCode, res.id, !res.isIdentityRevealed)}
                        size="sm"
                        variant={res.isIdentityRevealed ? "default" : "outline"}
                        className={`flex-grow font-bold gap-1 text-xs h-9 ${
                          res.isIdentityRevealed
                            ? "bg-yellow-300 hover:bg-yellow-400 text-zinc-950"
                            : "border-white/10 hover:bg-white/10 text-white"
                        }`}
                        disabled={!res.isRevealed}
                      >
                        {res.isIdentityRevealed ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            Hide User
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            Reveal User
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* QR Code Presentation Overlay Modal */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <GlassCard className="p-6 relative text-center">
                <button
                  onClick={() => setShowQrModal(false)}
                  className="absolute top-4 right-4 text-zinc-400 hover:text-white text-xl font-bold cursor-pointer"
                >
                  &times;
                </button>
                <h3 className="text-2xl font-black text-white mb-2">Scan to Join</h3>
                <p className="text-zinc-300 text-sm mb-4">Event Code: <span className="text-yellow-300 font-bold">{eventData.eventCode}</span></p>
                <QrCodeDisplay url={getParticipantUrl()} size={230} />
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatedBackground>
  );
}
