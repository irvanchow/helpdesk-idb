"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Mail, Lock, ArrowRight, Heart } from "lucide-react";

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email atau password salah");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-8 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-60 h-[500px] w-[500px] rounded-full bg-blue-100/60 blur-3xl" />
        <div className="absolute -bottom-60 -left-60 h-[500px] w-[500px] rounded-full bg-orange-100/60 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-blue-50/40 blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#2563EB 1px, transparent 1px), linear-gradient(90deg, #2563EB 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B] tracking-tight">
            Helpdesk IDB Bali
          </h1>
          <p className="text-sm sm:text-base text-[#64748B] mt-2 font-medium">
            Support Ticket System
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] border border-[#E2E8F0] relative overflow-hidden">
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#2563EB]" />

          <div className="mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-[#1E293B]">
              Selamat Datang
            </h2>
            <p className="text-sm text-[#64748B] mt-1">
              Masukan akun anda untuk melanjutkan
            </p>
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="mb-5 border-red-200 bg-red-50 text-red-800 rounded-xl"
            >
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-semibold text-[#1E293B]"
              >
                Email Address
              </Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1F5F9]">
                  <Mail className="h-4 w-4 text-[#64748B]" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@idbbali.ac.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-14 h-12 rounded-xl border-[#E2E8F0] bg-[#F8FAFC] text-base focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-50 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-semibold text-[#1E293B]"
              >
                Password
              </Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1F5F9]">
                  <Lock className="h-4 w-4 text-[#64748B]" />
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Masukkan password Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-14 h-12 rounded-xl border-[#E2E8F0] bg-[#F8FAFC] text-base focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-50 transition-all"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-base shadow-lg shadow-blue-200/50 transition-all duration-200 hover:shadow-xl hover:shadow-blue-300/50 hover:-translate-y-0.5"
            >
              {isLoading ? (
                <span className="flex items-center gap-3">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Memproses...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Login <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E8F0]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-[#94A3B8] font-medium uppercase tracking-wider">
                atau
              </span>
            </div>
          </div>

          {/* Microsoft Login */}
          <Button
            type="button"
            variant="outline"
            onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/dashboard" })}
            className="w-full h-12 rounded-xl border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#1E293B] font-semibold text-sm transition-all duration-200 hover:border-[#CBD5E1]"
          >
            <MicrosoftIcon className="h-5 w-5 mr-2.5" />
            Login dengan Microsoft 365
          </Button>

        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-[#94A3B8]">
          Made with <Heart className="inline h-3.5 w-3.5 text-red-500 fill-red-500 mx-0.5" /> in IDB Bali
        </p>
      </div>
    </div>
  );
}
