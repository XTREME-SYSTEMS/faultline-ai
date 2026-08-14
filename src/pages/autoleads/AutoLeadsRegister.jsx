import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AlAuthShell from "@/components/autoleads/AlAuthShell";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import { brandedSafeReturnTo, sanitizeBrandedReturnToInUrl } from "@/lib/authReturnTo";

// AUTO LEADS-branded register. Mirrors the OTP flow from the builder Register
// page but on the AUTO LEADS brand surface.
export default function AutoLeadsRegister() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const safeTo = sanitizeBrandedReturnToInUrl();
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      window.location.href = safeTo;
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({ title: "Code sent", description: "Check your email for the new code." });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => {
    sanitizeBrandedReturnToInUrl();
    base44.auth.loginWithProvider("google", brandedSafeReturnTo());
  };

  const loginTo =
    "/autoleads/login" +
    (brandedSafeReturnTo() !== "/lgny" ? "?returnTo=" + encodeURIComponent(brandedSafeReturnTo()) : "");

  if (showOtp) {
    return (
      <AlAuthShell>
        <h2 className="font-[Libre_Caslon_Display,serif] text-3xl tracking-tight text-[#0B0B0D]">
          Verify your email
        </h2>
        <p className="text-[#666] mt-1 mb-6">We sent a code to {email}</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[#f5d8d5] text-[#a52d23] text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <button
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
          className="w-full h-12 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#FFE566,#FFD700)", color: "#0B0B0D" }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify"
          )}
        </button>
        <p className="text-center text-sm text-[#666] mt-4">
          Didn't receive the code?{" "}
          <button onClick={handleResend} className="text-[#B8860B] font-semibold hover:underline">
            Resend
          </button>
        </p>
      </AlAuthShell>
    );
  }

  return (
    <AlAuthShell
      footer={
        <>
          Already have an account?{" "}
          <Link to={loginTo} className="text-[#B8860B] font-semibold hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <h2 className="font-[Libre_Caslon_Display,serif] text-3xl tracking-tight text-[#0B0B0D]">
        Create your account
      </h2>
      <p className="text-[#666] mt-1 mb-7">Start your 14-day free trial</p>

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
          <label htmlFor="al-reg-email" className="text-xs font-bold text-[#0B0B0D]">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aaa]" />
            <input
              id="al-reg-email"
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
          <label htmlFor="al-reg-pw" className="text-xs font-bold text-[#0B0B0D]">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aaa]" />
            <input
              id="al-reg-pw"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 pl-10 pr-3 rounded-lg border border-[#d7d7d7] text-sm outline-none focus:border-[#FFD700] transition-colors"
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="al-reg-cpw" className="text-xs font-bold text-[#0B0B0D]">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aaa]" />
            <input
              id="al-reg-cpw"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              Creating account...
            </>
          ) : (
            <>
              Create account <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AlAuthShell>
  );
}