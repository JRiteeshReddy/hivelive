"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { 
  Check, X, Star, MessageSquareCheck, Volume2, ShieldAlert, Sparkles,
  ArrowRight, Undo, HelpCircle, AlertCircle, Clock, Trash2, Tag, Loader2
} from "lucide-react";
import { 
  listenToEvent, listenToResponses, moderateResponse, 
  toggleResponseStar, toggleResponseTag, isMockMode 
} from "@/lib/db";
import { EventData, ResponseData } from "@/lib/types";

interface PageProps {
  params: Promise<{ adminKey: string }>;
}

export default function ModeratorDashboardPage({ params }: PageProps) {
  const router = useRouter();
  const { adminKey } = use(params);

  // Core Data States
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI filter states
  const [historyTab, setHistoryTab] = useState<"approved" | "rejected">("approved");

  // Authenticate & Subscribe
  useEffect(() => {
    let unsubscribeEvent = () => {};
    let unsubscribeResponses = () => {};

    const savedCode = localStorage.getItem("hive_active_event_code");
    const savedKey = localStorage.getItem("hive_active_admin_key");
    
    if (!savedCode || savedKey !== adminKey) {
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

      unsubscribeResponses = listenToResponses(code, (data) => {
        setResponses(data);
      });
    }

    return () => {
      unsubscribeEvent();
      unsubscribeResponses();
    };
  }, [adminKey]);

  // Actions
  const handleApprove = async (resId: string) => {
    if (!eventData) return;
    await moderateResponse(eventData.eventCode, resId, "approved");
  };

  const handleReject = async (resId: string) => {
    if (!eventData) return;
    await moderateResponse(eventData.eventCode, resId, "rejected");
  };

  const handleUndo = async (resId: string) => {
    if (!eventData) return;
    await moderateResponse(eventData.eventCode, resId, "pending");
  };

  const handleToggleStar = async (resId: string, currentVal: boolean) => {
    if (!eventData) return;
    await toggleResponseStar(eventData.eventCode, resId, !currentVal);
  };

  const handleToggleTag = async (resId: string, tag: string, tagsList: string[]) => {
    if (!eventData) return;
    const hasTag = tagsList.includes(tag);
    await toggleResponseTag(eventData.eventCode, resId, tag, hasTag);
  };

  // Group responses
  const pendingResponses = responses.filter((r) => r.moderationStatus === "pending");
  const approvedHistory = responses.filter((r) => r.moderationStatus === "approved");
  const rejectedHistory = responses.filter((r) => r.moderationStatus === "rejected");

  if (loading) {
    return (
      <AnimatedBackground>
        <div className="flex-grow flex items-center justify-center p-4">
          <Loader2 className="animate-spin w-12 h-12 text-yellow-300" />
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
            <h3 className="text-2xl font-black text-white">Authentication Failed</h3>
            <p className="text-zinc-300 text-sm mt-2">
              Moderator access was denied. Please double check the URL parameters and retry.
            </p>
            <Button onClick={() => router.push("/")} className="mt-6 bg-white hover:bg-zinc-100 text-zinc-950 font-bold">
              Go to Home
            </Button>
          </GlassCard>
        </div>
      </AnimatedBackground>
    );
  }

  const tags = [
    { name: "funny", label: "Funny 😂" },
    { name: "creative", label: "Creative 🚀" },
    { name: "wild", label: "Wild 💀" }
  ];

  return (
    <AnimatedBackground>
      {/* Top Navbar */}
      <nav className="glass-panel w-full border-b border-white/10 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black text-white tracking-wider cursor-pointer" onClick={() => router.push("/")}>
            HIVE<span className="text-yellow-300">Live</span>
          </h2>
          <span className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-xs font-bold text-orange-400">
            MODERATOR DECK
          </span>
          <span className="text-zinc-400 text-sm font-mono font-bold bg-black/35 px-2.5 py-1 rounded-lg border border-white/5">
            CODE: {eventData.eventCode}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push(`/admin/${adminKey}/host`)}
            className="bg-yellow-300 hover:bg-yellow-400 text-zinc-950 font-bold"
          >
            Host Dashboard
          </Button>
          <Button
            onClick={() => router.push(`/admin/${adminKey}/presentation`)}
            variant="outline"
            className="border-white/10 hover:bg-white/10 text-white"
          >
            Projector Screen
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

      {/* Moderator workspace grid */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl w-full mx-auto z-10 items-start">
        
        {/* Main Column: Pending cards (8 columns) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black text-white">Pending Inbox</h2>
              <p className="text-zinc-300 text-sm mt-1">Moderate incoming participant responses in real time.</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold font-mono">
              Inbox size: <span className="text-orange-400 font-bold">{pendingResponses.length}</span>
            </div>
          </div>

          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {pendingResponses.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center text-center p-12 border border-dashed border-white/10 rounded-3xl"
                >
                  <Clock className="h-10 w-10 text-zinc-500 mb-3 animate-pulse" />
                  <p className="text-zinc-300 font-bold text-lg">Inbox is currently empty.</p>
                  <p className="text-zinc-400 text-sm max-w-xs mt-1">
                    Incoming answers will pop up here instantly. Keep this tab open!
                  </p>
                </motion.div>
              ) : (
                pendingResponses.map((res) => (
                  <motion.div
                    key={res.id}
                    layoutId={res.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  >
                    <GlassCard className="p-6 relative flex flex-col gap-4 group/card border-white/10 hover:border-white/20">
                      
                      {/* Top row: Identity and submitted time */}
                      <div className="flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-400">From:</span>
                          <span className="text-sm font-black font-mono text-yellow-300 bg-black/45 px-2 py-0.5 rounded border border-white/5">
                            {res.participantIdentifier}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {new Date(res.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>

                      {/* Content Answer */}
                      <p className="text-white text-lg md:text-xl font-bold leading-relaxed">{res.answer}</p>

                      {/* Middle row: Tags & Star selection */}
                      <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/5 flex-wrap">
                        {/* Tags selection */}
                        <div className="flex gap-1.5 flex-wrap items-center">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1 mr-1">
                            <Tag className="h-3 w-3" /> Tags:
                          </span>
                          {tags.map((tag) => {
                            const active = res.tags?.includes(tag.name);
                            return (
                              <button
                                key={tag.name}
                                onClick={() => handleToggleTag(res.id, tag.name, res.tags || [])}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                                  active
                                    ? "bg-white text-zinc-950 border-white font-bold scale-[1.05]"
                                    : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                                }`}
                              >
                                {tag.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Star highlight selection */}
                        <button
                          onClick={() => handleToggleStar(res.id, res.isStarred)}
                          className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            res.isStarred
                              ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-400"
                              : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                          }`}
                        >
                          <Star className={`h-4 w-4 ${res.isStarred ? "fill-current" : ""}`} />
                        </button>
                      </div>

                      {/* Bottom action row: Approve / Reject */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <Button
                          onClick={() => handleReject(res.id)}
                          variant="outline"
                          className="border-red-500/20 hover:bg-red-500/10 text-red-400 font-bold flex items-center justify-center gap-2 h-11"
                        >
                          <X className="h-5 w-5" />
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleApprove(res.id)}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold flex items-center justify-center gap-2 h-11"
                        >
                          <Check className="h-5 w-5" />
                          Approve
                        </Button>
                      </div>

                    </GlassCard>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: History panel (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          <GlassCard className="min-h-[500px] flex flex-col">
            <h3 className="text-xl font-bold text-white mb-4 shrink-0 flex items-center gap-2">
              <MessageSquareCheck className="h-5 w-5 text-yellow-300" />
              Moderation History
            </h3>

            {/* Tabs selector */}
            <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-xl border border-white/5 mb-4 shrink-0">
              <button
                onClick={() => setHistoryTab("approved")}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyTab === "approved"
                    ? "bg-green-600 text-white shadow"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                Approved ({approvedHistory.length})
              </button>
              <button
                onClick={() => setHistoryTab("rejected")}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyTab === "rejected"
                    ? "bg-red-600 text-white shadow"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                Rejected ({rejectedHistory.length})
              </button>
            </div>

            {/* List panel */}
            <div className="flex-grow overflow-y-auto max-h-[450px] space-y-3 pr-2">
              {historyTab === "approved" && (
                approvedHistory.length === 0 ? (
                  <p className="text-zinc-500 text-xs text-center py-8">No approved responses yet.</p>
                ) : (
                  approvedHistory.map((res) => (
                    <div key={res.id} className="p-3.5 rounded-lg bg-green-500/5 border border-green-500/10 flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-green-400 font-mono">{res.participantIdentifier}</span>
                        <button
                          onClick={() => handleUndo(res.id)}
                          className="flex items-center gap-1 text-zinc-400 hover:text-white cursor-pointer bg-white/5 px-2 py-0.5 rounded border border-white/5"
                        >
                          <Undo className="h-2.5 w-2.5" /> Undo
                        </button>
                      </div>
                      <p className="text-white text-sm line-clamp-3 leading-relaxed">{res.answer}</p>
                    </div>
                  ))
                )
              )}

              {historyTab === "rejected" && (
                rejectedHistory.length === 0 ? (
                  <p className="text-zinc-500 text-xs text-center py-8">No rejected responses yet.</p>
                ) : (
                  rejectedHistory.map((res) => (
                    <div key={res.id} className="p-3.5 rounded-lg bg-red-500/5 border border-red-500/10 flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-red-400 font-mono">{res.participantIdentifier}</span>
                        <button
                          onClick={() => handleUndo(res.id)}
                          className="flex items-center gap-1 text-zinc-400 hover:text-white cursor-pointer bg-white/5 px-2 py-0.5 rounded border border-white/5"
                        >
                          <Undo className="h-2.5 w-2.5" /> Undo
                        </button>
                      </div>
                      <p className="text-white text-sm line-clamp-3 leading-relaxed">{res.answer}</p>
                    </div>
                  ))
                )
              )}
            </div>

          </GlassCard>
        </div>
      </div>
    </AnimatedBackground>
  );
}
