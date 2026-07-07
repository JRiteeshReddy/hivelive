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
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10 select-none z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-yellow-400/90 font-semibold text-xs tracking-wider uppercase mb-5 shadow-2xl backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-orange-500 animate-pulse" /> Live Engagement Platform
          </div>
          <h1 className="text-7xl md:text-8xl font-black tracking-tight leading-none bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(249,115,22,0.2)]">
            HIVE<span className="text-white">Live</span>
          </h1>
          <p className="text-zinc-400 mt-4 text-base md:text-lg font-medium max-w-sm mx-auto leading-relaxed">
            Real-time interactive audience hub for college events, workshops, and seminars.
          </p>
        </motion.div>

        {/* Content Container */}
        <div className="w-full max-w-md min-h-[320px] flex items-stretch z-10">
          <AnimatePresence mode="wait">
            {flow === "menu" && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full flex flex-col gap-4"
              >
                <GlassCard className="flex flex-col gap-5 justify-center flex-grow p-8 border-white/5 bg-zinc-950/30">
                  {/* Create Event Button */}
                  <Button
                    onClick={() => setFlow("create")}
                    className="w-full py-7 text-lg font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 rounded-xl shadow-[0_0_30px_rgba(249,115,22,0.25)] hover:shadow-[0_0_35px_rgba(249,115,22,0.45)] border border-orange-400/20 flex items-center justify-center gap-3 cursor-pointer group"
                  >
                    <PlusCircle className="h-5 w-5 text-white transition-transform group-hover:rotate-90" />
                    Create Event
                  </Button>

                  {/* Join Event Button */}
                  <Button
                    onClick={() => setFlow("join")}
                    className="w-full py-7 text-lg font-bold bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-400/30 text-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.2)] hover:shadow-[0_0_30px_rgba(253,224,71,0.15)] flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <Users className="h-5 w-5 text-yellow-400" />
                    Join Event
                  </Button>
                </GlassCard>
              </motion.div>
            )}

            {flow === "join" && (
              <motion.div
                key="join"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="w-full"
              >
                <GlassCard className="p-8 border-white/5 bg-zinc-950/30">
                  <h2 className="text-3xl font-black text-white mb-2">Join Event</h2>
                  <p className="text-zinc-400 text-sm mb-6">Enter the 5-digit event code to join the interactive session.</p>
                  
                  <form onSubmit={handleJoinSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Event Code</label>
                      <Input
                        type="text"
                        maxLength={5}
                        placeholder="12345"
                        value={eventCodeInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setEventCodeInput(val);
                        }}
                        className="glass-input h-14 text-center text-4xl font-black font-mono tracking-[0.25em] rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/50"
                        autoFocus
                      />
                    </div>

                    {joinError && (
                      <div className="flex items-center gap-2 text-red-400 text-sm p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
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
                        className="w-1/3 border-white/10 hover:bg-white/10 text-white rounded-xl h-12 font-bold cursor-pointer"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={eventCodeInput.length !== 5 || isVerifying}
                        className="w-2/3 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white font-bold rounded-xl h-12 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.2)] cursor-pointer"
                      >
                        {isVerifying ? "Verifying..." : "Join Event"}
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
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="w-full"
              >
                <GlassCard className="p-8 border-white/5 bg-zinc-950/30">
                  <h2 className="text-3xl font-black bg-gradient-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent mb-2">Configure Event</h2>
                  <p className="text-zinc-400 text-sm mb-6">
                    Customize what participants need to fill out in order to join the live session.
                  </p>

                  <form onSubmit={handleCreateSubmit} className="space-y-5">
                    {/* Identifier Label */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        Input Label Text
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Enter your Roll Number"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className="glass-input h-12 text-sm rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/50"
                        required
                      />
                    </div>

                    {/* Identifier Placeholder */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Input Placeholder Text</label>
                      <Input
                        type="text"
                        placeholder="e.g. 2021BCS012"
                        value={placeholder}
                        onChange={(e) => setPlaceholder(e.target.value)}
                        className="glass-input h-12 text-sm rounded-xl focus-visible:ring-2 focus-visible:ring-orange-500/50"
                        required
                      />
                    </div>

                    {/* Input Field Type */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Input Field Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setInputType("text")}
                          className={`py-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                            inputType === "text"
                              ? "bg-gradient-to-r from-orange-600 to-amber-500 text-white border-transparent shadow-[0_0_15px_rgba(249,115,22,0.15)] font-black"
                              : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:border-yellow-400/20"
                          }`}
                        >
                          Text Input
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputType("number")}
                          className={`py-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                            inputType === "number"
                              ? "bg-gradient-to-r from-orange-600 to-amber-500 text-white border-transparent shadow-[0_0_15px_rgba(249,115,22,0.15)] font-black"
                              : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:border-yellow-400/20"
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
                        className="w-1/3 border-white/10 hover:bg-white/10 text-white rounded-xl h-12 font-bold cursor-pointer"
                        disabled={isGenerating}
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={isGenerating}
                        className="w-2/3 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white font-bold rounded-xl h-12 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.2)] cursor-pointer"
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
