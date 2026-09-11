import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import AlAuthShell from "@/components/autoleads/AlAuthShell";
import GoogleIcon from "@/components/GoogleIcon";
import { brandedSafeReturnTo, sanitizeBrandedReturnToInUrl } from "@/lib/authReturnTo";

// AUTO LEADS-branded login. Distinct route from the FaultLine builder login
// (/login) so rebranded clones send visitors here instead of the admin app.
export default function AutoLeadsLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const returnTo = brandedSafeReturnTo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const safeTo = sanitizeBrandedReturnToInUrl();
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = safeTo;
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    sanitizeBrandedReturnToInUrl();
    base44.auth.loginWithProvider("google", brandedSafeReturnTo());
  };

  const registerTo =
    "/autoleads/register" +
    (returnTo !== "/lgny" ? "?returnTo=" + encodeURIComponent(returnTo) : "");

  return (
    <AlAuthShell
      footer={
        <>
          Don't have an account?{" "}
          <Link to={registerTo} className="text-[#B8860B] font-semibold hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <h2 className="font-[Libre_Caslon_Display,serif] text-3xl tracking-tight text-[#0B0B0D]">
        Welcome back
      </h2>
      <p className="text-[#666] mt-1 mb-7">Log in to your FaultLine AI account</p>

      <button
        onClick={handleGoogle}
        className="w-full h-12 rounded-lg border border-[#e5e1da] bg-white text-sm font-medium flex items-center justify-center gap-2 hover:border-[#d4cdbf] transition-colors mb-5"
      >
        <GoogleIcon className="w-5 h-5" />
        Continue with Google
      </button>

      <div className="relative mb-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#e5e1da]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-[#999]">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[#f5d8d5] text-[#a52d23] text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="al-email" className="text-xs font-bold text-[#0B0B0D]">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aaa]" />
            <input
              id="al-email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 pl-10 pr-3 rounded-lg border border-[#d7d7d7] text-sm outline-none focus:border-[#FFD700] transition-colors"
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="al-pw" className="text-xs font-bold text-[#0B0B0D]">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aaa]" />
            <input
              id="al-pw"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 pl-10 pr-3 rounded-lg border border-[#d7d7d7] text-sm outline-none focus:border-[#FFD700] transition-colors"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#FFE566,#FFD700)", color: "#0B0B0D" }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Logging in...
            </>
          ) : (
            <>
              Log in <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AlAuthShell>
  );
}