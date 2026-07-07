"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, LayoutDashboard, MonitorPlay, MessageSquareCheck, AlertCircle } from "lucide-react";
import { findEventByAdminKey } from "@/lib/db";

interface PageProps {
  params: Promise<{ adminKey: string }>;
}

export default function AdminJoinPage({ params }: PageProps) {
  const router = useRouter();
  const { adminKey } = use(params);
  const [eventCode, setEventCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function verifyKey() {
      try {
        const code = await findEventByAdminKey(adminKey);
        if (code) {
          // Store credentials in localStorage
          localStorage.setItem(`hive_admin_auth_${code}`, adminKey);
          localStorage.setItem("hive_active_event_code", code);
          localStorage.setItem("hive_active_admin_key", adminKey);
          setEventCode(code);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Verification error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    verifyKey();
  }, [adminKey]);

  return (
    <AnimatedBackground>
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {loading && (
            <GlassCard className="text-center p-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="inline-block w-12 h-12 border-4 border-yellow-300 border-t-transparent rounded-full mb-4"
              />
              <h2 className="text-2xl font-bold text-white">Verifying Admin Key...</h2>
              <p className="text-zinc-300 mt-2">Authenticating event details securely.</p>
            </GlassCard>
          )}

          {error && !loading && (
            <GlassCard className="p-8 text-center border-red-500/25">
              <div className="inline-flex p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
                <AlertCircle className="h-10 w-10" />
              </div>
              <h2 className="text-3xl font-extrabold text-white">Access Denied</h2>
              <p className="text-zinc-300 mt-2 max-w-sm mx-auto">
                The administrative key provided is invalid or has expired. Make sure you copied the correct link.
              </p>
              <Button
                onClick={() => router.push("/")}
                className="mt-6 bg-white hover:bg-zinc-100 text-zinc-950 font-bold"
              >
                Go to Homepage
              </Button>
            </GlassCard>
          )}

          {eventCode && !loading && (
            <GlassCard className="p-8">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 mb-3">
                  <ShieldCheck className="h-10 w-10" />
                </div>
                <h2 className="text-3xl font-black text-white">Admin Access Granted</h2>
                <p className="text-zinc-300 mt-1">
                  You are now an administrator for Event{" "}
                  <span className="font-mono text-yellow-300 font-bold text-lg bg-black/40 px-2 py-0.5 rounded border border-white/5">
                    {eventCode}
                  </span>
                </p>
              </div>

              <div className="space-y-4">
                {/* Host Dashboard Link */}
                <div className="group relative flex items-center justify-between p-4 rounded-xl border border-white/10 hover:border-yellow-300/40 bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer"
                  onClick={() => router.push(`/admin/${adminKey}/host`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-300/10 text-yellow-300">
                      <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">Host Dashboard</h4>
                      <p className="text-xs text-zinc-300">Control active questions, view lists, and reveal submissions.</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-zinc-400 group-hover:text-yellow-300 transition-transform group-hover:translate-x-1" />
                </div>

                {/* Moderator Dashboard Link */}
                <div className="group relative flex items-center justify-between p-4 rounded-xl border border-white/10 hover:border-orange-500/40 bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer"
                  onClick={() => router.push(`/admin/${adminKey}/moderator`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                      <MessageSquareCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">Moderator Panel</h4>
                      <p className="text-xs text-zinc-300">Approve, reject, star, and tag incoming response cards.</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-zinc-400 group-hover:text-orange-400 transition-transform group-hover:translate-x-1" />
                </div>

                {/* Presentation Mode Link */}
                <div className="group relative flex items-center justify-between p-4 rounded-xl border border-white/10 hover:border-red-500/40 bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer"
                  onClick={() => router.push(`/admin/${adminKey}/presentation`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                      <MonitorPlay className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">Presentation Mode</h4>
                      <p className="text-xs text-zinc-300">Open on a projector. Displays approved answers with animations.</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-zinc-400 group-hover:text-red-400 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </AnimatedBackground>
  );
}
