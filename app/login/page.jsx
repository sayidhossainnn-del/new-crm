"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

const bg = "#08080a";
const panel = "#111114";
const panelBorder = "#212126";
const textMuted = "#8a8a92";
const textFaint = "#5c5c63";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setNotice("Account created. Check your email to confirm, then sign in.");
      setMode("signin");
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center" style={{ background: bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="w-full max-w-[380px] rounded-2xl p-6" style={{ background: panel, border: `1px solid ${panelBorder}` }}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[14px]" style={{ background: "linear-gradient(135deg,#f6538b,#8b5cf6)", color: "white" }}>F</div>
          <div className="flex flex-col leading-tight">
            <span className="text-[14px] font-semibold text-white">Flinza Works</span>
            <span className="text-[10.5px]" style={{ color: textFaint }}>CRM</span>
          </div>
        </div>

        <h1 className="text-[16px] font-medium text-white mb-1">
          {mode === "signin" ? "Sign in to your CRM" : "Create your account"}
        </h1>
        <p className="text-[12px] mb-5" style={{ color: textMuted }}>
          {mode === "signin" ? "Access the Flinza Works prospect pipeline." : "For Flinza Works team members only."}
        </p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px]" style={{ color: textFaint }}>Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@flinzaworks.com"
              className="text-[13px] px-3 py-2.5 rounded-lg outline-none"
              style={{ color: "white", background: "#1a1a1e", border: `1px solid ${panelBorder}` }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px]" style={{ color: textFaint }}>Password</label>
            <input
              type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="text-[13px] px-3 py-2.5 rounded-lg outline-none"
              style={{ color: "white", background: "#1a1a1e", border: `1px solid ${panelBorder}` }}
            />
          </div>

          {error && <div className="text-[11.5px] px-3 py-2 rounded-lg" style={{ color: "#f5533f", background: "#f5533f18" }}>{error}</div>}
          {notice && <div className="text-[11.5px] px-3 py-2 rounded-lg" style={{ color: "#3ddc84", background: "#3ddc8418" }}>{notice}</div>}

          <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 text-[13px] font-medium px-3.5 py-2.5 rounded-lg mt-1 disabled:opacity-60" style={{ color: "#08080a", background: "#ffffff" }}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            {mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setNotice(""); }}
          className="text-[11.5px] mt-4 w-full text-center hover:text-white transition-colors"
          style={{ color: textMuted }}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
