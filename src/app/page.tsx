"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, Users, ArrowRight, Settings, Sparkles, AlertCircle, HelpCircle } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createEvent, checkEventExists, generateEventCode, generateAdminKey } from "@/lib/db";
import { ParticipantIdentifierConfig } from "@/lib/types";

export default function LandingPage() {
  const router = useRouter();
  
  // Navigation states
  const [flow, setFlow] = useState<"menu" | "join" | "create">("menu");
  
  // Join Flow state
  const [eventCodeInput, setEventCodeInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Create Flow configuration states
  const [label, setLabel] = useState("Enter your Name");
  const [placeholder, setPlaceholder] = useState("e.g. Alice");
  const [inputType, setInputType] = useState<"text" | "number">("text");
  const [isGenerating, setIsGenerating] = useState(false);

  // Handle Joining Event
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");
    const trimmedCode = eventCodeInput.trim();
    
    if (trimmedCode.length !== 5 || isNaN(Number(trimmedCode))) {
      setJoinError("Event code must be a 5-digit number.");
      return;
    }

    setIsVerifying(true);
    const exists = await checkEventExists(trimmedCode);
    setIsVerifying(false);

    if (exists || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "mock-api-key") {
      // In mock mode we allow joining anything for instant testing
      router.push(`/join/${trimmedCode}`);
    } else {
      setJoinError("Event not found. Make sure the code is correct.");
    }
  };

  // Handle Creating Event
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    
    const eventCode = generateEventCode();
    const adminKey = generateAdminKey();
    
    const config: ParticipantIdentifierConfig = {
      label: label.trim() || "Enter your Name",
      placeholder: placeholder.trim() || "e.g. Alice",
      type: inputType,
    };

    const success = await createEvent(eventCode, adminKey, config);
    setIsGenerating(false);

    if (success) {
      router.push(`/admin/join/${adminKey}`);
    } else {
      alert("Failed to create event. Please try again.");
    }
  };

  return (
    <AnimatedBackground>
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        {/* Logo / Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-yellow-300 font-medium text-sm mb-4 shadow-inner">
            <Sparkles className="h-4 w-4" /> Live Engagement Platform
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white drop-shadow-md">
            HIVE<span className="text-yellow-300">Live</span>
          </h1>
          <p className="text-zinc-200 mt-2 text-lg md:text-xl font-medium max-w-md mx-auto">
            Interact with your audience in real time. Perfect for seminars, workshops, and college events.
          </p>
        </motion.div>

        {/* Content Container */}
        <div className="w-full max-w-md min-h-[320px] flex items-stretch">
          <AnimatePresence mode="wait">
            {flow === "menu" && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="w-full flex flex-col gap-4"
              >
                <GlassCard className="flex flex-col gap-6 justify-center flex-grow p-8">
                  {/* Create Event Button */}
                  <Button
                    onClick={() => setFlow("create")}
                    className="w-full py-8 text-xl font-bold bg-white text-zinc-950 hover:bg-zinc-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 rounded-2xl shadow-xl flex items-center justify-center gap-3 cursor-pointer group"
                  >
                    <PlusCircle className="h-6 w-6 text-orange-600 transition-transform group-hover:rotate-90" />
                    Create Event
                  </Button>

                  {/* Join Event Button */}
                  <Button
                    onClick={() => setFlow("join")}
                    className="w-full py-8 text-xl font-bold bg-zinc-950/40 hover:bg-zinc-950/60 border border-white/20 text-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 rounded-2xl shadow-xl flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <Users className="h-6 w-6 text-yellow-300" />
                    Join Event
                  </Button>
                </GlassCard>
              </motion.div>
            )}

            {flow === "join" && (
              <motion.div
                key="join"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full"
              >
                <GlassCard className="p-8">
                  <h2 className="text-3xl font-extrabold text-white mb-6">Join Event</h2>
                  <form onSubmit={handleJoinSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-300">Enter Event Code</label>
                      <Input
                        type="text"
                        maxLength={5}
                        placeholder="12345"
                        value={eventCodeInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setEventCodeInput(val);
                        }}
                        className="glass-input h-14 text-center text-3xl font-mono tracking-widest rounded-xl focus-visible:ring-2 focus-visible:ring-yellow-300"
                        autoFocus
                      />
                    </div>

                    {joinError && (
                      <div className="flex items-center gap-2 text-red-400 text-sm p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{joinError}</span>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setFlow("menu");
                          setJoinError("");
                          setEventCodeInput("");
                        }}
                        className="w-1/3 border-white/10 hover:bg-white/10 text-white"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={eventCodeInput.length !== 5 || isVerifying}
                        className="w-2/3 bg-yellow-300 hover:bg-yellow-400 text-zinc-950 font-bold flex items-center justify-center gap-2"
                      >
                        {isVerifying ? "Verifying..." : "Join"}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </GlassCard>
              </motion.div>
            )}

            {flow === "create" && (
              <motion.div
                key="create"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full"
              >
                <GlassCard className="p-8">
                  <h2 className="text-3xl font-extrabold text-white mb-2">Configure Identity</h2>
                  <p className="text-zinc-300 text-sm mb-6">
                    Customize what participants need to fill out in order to join the event.
                  </p>

                  <form onSubmit={handleCreateSubmit} className="space-y-4">
                    {/* Identifier Label */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
                        Input Label Text
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Enter your Roll Number"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className="glass-input h-11"
                        required
                      />
                    </div>

                    {/* Identifier Placeholder */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-300">Input Placeholder Text</label>
                      <Input
                        type="text"
                        placeholder="e.g. 2021BCS012"
                        value={placeholder}
                        onChange={(e) => setPlaceholder(e.target.value)}
                        className="glass-input h-11"
                        required
                      />
                    </div>

                    {/* Input Field Type */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-300">Input Field Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setInputType("text")}
                          className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                            inputType === "text"
                              ? "bg-white text-zinc-950 border-white"
                              : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10"
                          }`}
                        >
                          Text Input
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputType("number")}
                          className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                            inputType === "number"
                              ? "bg-white text-zinc-950 border-white"
                              : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10"
                          }`}
                        >
                          Number Input
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setFlow("menu")}
                        className="w-1/3 border-white/10 hover:bg-white/10 text-white"
                        disabled={isGenerating}
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={isGenerating}
                        className="w-2/3 bg-yellow-300 hover:bg-yellow-400 text-zinc-950 font-bold"
                      >
                        {isGenerating ? "Generating..." : "Generate Event"}
                      </Button>
                    </div>
                  </form>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Small warning if in Mock Mode */}
        {process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "mock-api-key" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 flex items-center gap-1.5 text-xs text-yellow-300/80 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20 max-w-sm text-center"
          >
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>Running in Demo Mode. Real-time updates sync locally across browser tabs.</span>
          </motion.div>
        )}
      </div>
    </AnimatedBackground>
  );
}
