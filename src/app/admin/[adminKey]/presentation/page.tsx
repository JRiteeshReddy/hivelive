"use client";

import React, { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { 
  ShieldAlert, Sparkles, Trophy, User, Calendar, Clock, Play, Pause,
  RotateCcw, Maximize, Keyboard, Award, Info, AlertCircle, Eye, EyeOff
} from "lucide-react";
import { listenToEvent, listenToRevealedResponses, revealResponseIdentity } from "@/lib/db";
import { EventData, ResponseData } from "@/lib/types";
import confetti from "canvas-confetti";

interface PageProps {
  params: Promise<{ adminKey: string }>;
}

export default function PresentationPage({ params }: PageProps) {
  const router = useRouter();
  const { adminKey } = use(params);

  // Core Data States
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [revealedResponses, setRevealedResponses] = useState<ResponseData[]>([]);
  const [loading, setLoading] = useState(true);

  // Presentation Slider State
  const [currentIndex, setCurrentIndex] = useState(0);

  // Helper references to prevent stale closures in event listener
  const currentIndexRef = useRef(currentIndex);
  const responsesRef = useRef(revealedResponses);
  const eventCodeRef = useRef<string | null>(null);

  // UI Presentation States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Timer Stopwatch States
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [timerActive, setTimerActive] = useState(false);

  // Sync refs
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    responsesRef.current = revealedResponses;
    // Auto-adjust index if length decreases
    if (currentIndex >= revealedResponses.length && revealedResponses.length > 0) {
      setCurrentIndex(revealedResponses.length - 1);
    }
  }, [revealedResponses]);

  useEffect(() => {
    if (eventData) {
      eventCodeRef.current = eventData.eventCode;
    }
  }, [eventData]);

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
        if (data) setEventData(data);
        setLoading(false);
      });

      unsubscribeResponses = listenToRevealedResponses(code, (data) => {
        setRevealedResponses(data);
      });
    }

    return () => {
      unsubscribeEvent();
      unsubscribeResponses();
    };
  }, [adminKey]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeCard = responsesRef.current[currentIndexRef.current];
      const code = eventCodeRef.current;

      switch (e.key.toLowerCase()) {
        // Next Card
        case "arrowright":
        case " ":
          e.preventDefault();
          if (currentIndexRef.current < responsesRef.current.length - 1) {
            setCurrentIndex((prev) => prev + 1);
          }
          break;
        // Previous Card
        case "arrowleft":
          e.preventDefault();
          if (currentIndexRef.current > 0) {
            setCurrentIndex((prev) => prev - 1);
          }
          break;
        // Reveal Identity Toggle
        case "i":
          if (activeCard && code) {
            revealResponseIdentity(code, activeCard.id, !activeCard.isIdentityRevealed);
          }
          break;
        // Fullscreen Toggle
        case "f":
          toggleFullscreen();
          break;
        // Confetti Trigger
        case "c":
          triggerConfetti();
          break;
        // Timer Toggle
        case "t":
          setShowTimer((prev) => !prev);
          break;
        // Shortcuts Panel Help Toggle
        case "h":
        case "?":
          setShowShortcutsHelp((prev) => !prev);
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Timer Interval Hook
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            triggerConfetti(); // Confetti on timer expiration!
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timerSeconds]);

  // Actions
  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 }
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error("Fullscreen error:", err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false));
    }
  };

  const resetTimer = () => {
    setTimerSeconds(60);
    setTimerActive(false);
  };

  const activeCard = revealedResponses[currentIndex];

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
            <h3 className="text-2xl font-black text-white">Access Forbidden</h3>
            <p className="text-zinc-300 text-sm mt-2">
              Please open this page from the link inside the Host Dashboard.
            </p>
            <Button onClick={() => router.push("/")} className="mt-6 bg-white hover:bg-zinc-100 text-zinc-950 font-bold">
              Go to Homepage
            </Button>
          </GlassCard>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      {/* Presentation Header Container */}
      <div className="w-full px-12 py-8 flex justify-between items-center z-20 shrink-0">
        <div>
          <span className="text-xs font-black uppercase text-yellow-300 tracking-widest">PROJECTOR VIEW</span>
          <h2 className="text-3xl font-black text-white tracking-wider">
            HIVE<span className="text-yellow-300">Live</span>
          </h2>
        </div>
        
        {/* Helper Badge and Quick controls */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowShortcutsHelp((prev) => !prev)}
            variant="outline"
            className="border-white/10 hover:bg-white/10 text-white rounded-full p-2 h-10 w-10 flex items-center justify-center"
            title="Keyboard Shortcuts Guide"
          >
            <Keyboard className="h-5 w-5" />
          </Button>

          <Button
            onClick={toggleFullscreen}
            variant="outline"
            className="border-white/10 hover:bg-white/10 text-white rounded-full p-2 h-10 w-10 flex items-center justify-center"
          >
            <Maximize className="h-5 w-5" />
          </Button>

          <span className="text-sm font-bold font-mono bg-black/40 px-3 py-1.5 rounded-full border border-white/10 text-zinc-300">
            JOIN AT: <span className="text-yellow-300 font-black">join/{eventData.eventCode}</span>
          </span>
        </div>
      </div>

      {/* Presentation Centerpiece */}
      <div className="flex-grow flex items-center justify-center p-8 max-w-6xl w-full mx-auto relative z-10 select-none">
        <AnimatePresence mode="wait">
          {revealedResponses.length === 0 ? (
            <motion.div
              key="empty-present"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center"
            >
              <GlassCard className="p-12 max-w-xl border-yellow-300/10">
                <Trophy className="h-16 w-16 text-yellow-300 mx-auto mb-6 animate-bounce" />
                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                  Welcome to HIVE Live
                </h2>
                <p className="text-zinc-200 mt-4 text-lg font-medium max-w-md mx-auto">
                  Host is preparing to share approved response cards. Scan the QR code or enter code{" "}
                  <span className="text-yellow-300 font-bold underline font-mono">{eventData.eventCode}</span> on your phone!
                </p>
              </GlassCard>
            </motion.div>
          ) : (
            activeCard && (
              <motion.div
                key={activeCard.id}
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -40 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="w-full"
              >
                <GlassCard className="p-16 border-white/15 shadow-2xl relative min-h-[400px] flex flex-col justify-between overflow-hidden">
                  
                  {/* Top tags & decorations */}
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex gap-2">
                      {activeCard.isStarred && (
                        <span className="px-3 py-1 text-sm uppercase font-bold rounded bg-yellow-300/20 text-yellow-300 border border-yellow-300/30 flex items-center gap-1">
                          <Award className="h-4 w-4" /> STARRED
                        </span>
                      )}
                      {activeCard.tags.map((tag) => (
                        <span key={tag} className="px-3 py-1 text-sm uppercase font-bold rounded bg-white/10 text-white border border-white/5">
                          {tag === "funny" ? "Funny 😂" : tag === "creative" ? "Creative 🚀" : "Wild 💀"}
                        </span>
                      ))}
                    </div>

                    <span className="text-sm font-mono text-zinc-400 font-bold bg-white/5 px-2.5 py-1 rounded">
                      RESPONSE {currentIndex + 1} OF {revealedResponses.length}
                    </span>
                  </div>

                  {/* Main Response Typography */}
                  <div className="flex-grow flex items-center justify-center py-6">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white text-center leading-normal tracking-tight md:px-8">
                      "{activeCard.answer}"
                    </h1>
                  </div>

                  {/* Presenter identity card reveal animation */}
                  <div className="mt-8 border-t border-white/10 pt-8 flex flex-col items-center justify-center shrink-0">
                    <AnimatePresence mode="wait">
                      {activeCard.isIdentityRevealed ? (
                        <motion.div
                          key="identity-shown"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-yellow-300 text-zinc-950 border border-yellow-400 shadow-lg"
                        >
                          <User className="h-6 w-6 stroke-[2.5px]" />
                          <span className="text-xl md:text-2xl font-black font-mono tracking-wider">
                            {activeCard.participantIdentifier}
                          </span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="identity-hidden"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 text-zinc-400 text-sm md:text-base font-semibold"
                        >
                          <span>Identity Hidden</span>
                          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/15 text-xs text-zinc-300">
                            Press "I" to Reveal
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </GlassCard>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      {/* Floating Corner Stopwatch Timer */}
      <AnimatePresence>
        {showTimer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            className="fixed bottom-6 right-6 z-30"
          >
            <GlassCard className="p-4 flex items-center gap-4 border-yellow-300/30">
              <div className="text-center font-mono">
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">TIMER</p>
                <p className={`text-3xl font-black ${timerSeconds <= 10 && timerSeconds > 0 ? "text-red-500 animate-pulse" : "text-white"}`}>
                  {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, "0")}
                </p>
              </div>

              <div className="flex gap-1.5 border-l border-white/10 pl-3">
                <Button
                  onClick={() => setTimerActive((prev) => !prev)}
                  size="sm"
                  className={`h-8 w-8 p-0 rounded-lg flex items-center justify-center cursor-pointer ${
                    timerActive ? "bg-zinc-700 hover:bg-zinc-600 text-white" : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {timerActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={resetTimer}
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 rounded-lg border-white/10 hover:bg-white/10 text-white flex items-center justify-center cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Help Panel Overlay */}
      <AnimatePresence>
        {showShortcutsHelp && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md"
            >
              <GlassCard className="p-8 relative">
                <button
                  onClick={() => setShowShortcutsHelp(false)}
                  className="absolute top-4 right-4 text-zinc-400 hover:text-white text-xl font-bold cursor-pointer"
                >
                  &times;
                </button>
                
                <h3 className="text-2xl font-black text-white flex items-center gap-2 mb-6">
                  <Keyboard className="h-6 w-6 text-yellow-300" /> Keyboard Shortcuts
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-zinc-300 font-semibold text-sm">Next Response</span>
                    <span className="font-mono bg-white/10 px-2.5 py-1 rounded text-xs text-white border border-white/10">Space / ➔</span>
                  </div>
                  
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-zinc-300 font-semibold text-sm">Previous Response</span>
                    <span className="font-mono bg-white/10 px-2.5 py-1 rounded text-xs text-white border border-white/10">➔ Left Arrow</span>
                  </div>

                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-zinc-300 font-semibold text-sm">Toggle User Identity</span>
                    <span className="font-mono bg-white/10 px-2.5 py-1 rounded text-xs text-white border border-white/10">I Key</span>
                  </div>

                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-zinc-300 font-semibold text-sm">Trigger Confetti Blast</span>
                    <span className="font-mono bg-white/10 px-2.5 py-1 rounded text-xs text-white border border-white/10">C Key</span>
                  </div>

                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-zinc-300 font-semibold text-sm">Toggle Timer Display</span>
                    <span className="font-mono bg-white/10 px-2.5 py-1 rounded text-xs text-white border border-white/10">T Key</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-300 font-semibold text-sm">Toggle Fullscreen Mode</span>
                    <span className="font-mono bg-white/10 px-2.5 py-1 rounded text-xs text-white border border-white/10">F Key</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-1.5 text-xs text-zinc-400 bg-white/5 p-3 rounded-lg border border-white/5 leading-relaxed">
                  <Info className="h-4 w-4 shrink-0 text-yellow-300" />
                  <span>These shortcuts work anywhere on the presentation page. Space or Right Arrow shifts card slides smoothly.</span>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatedBackground>
  );
}
