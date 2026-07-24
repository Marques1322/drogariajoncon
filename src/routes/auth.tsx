import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Cross,
  Heart,
  Lock,
  Mail,
  Pill,
  Shield,
  Stethoscope,
  User as UserIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — PharmaERP" },
      { name: "description", content: "Acesse o ERP de gerenciamento de farmácias." },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot" | "verify";

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("expired")) return "Código expirado. Solicite um novo código.";
  if (m.includes("invalid") && m.includes("token"))
    return "Código inválido. Verifique os 6 dígitos e tente novamente.";
  if (m.includes("otp")) return "Código incorreto ou expirado. Tente novamente ou reenvie.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este e-mail já está cadastrado. Faça login.";
  return message;
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { nome_completo: nome },
      },
    });
    setLoading(false);
    if (error) return toast.error(friendlyAuthError(error.message));
    toast.success("Enviamos um código de 6 dígitos para o seu e-mail.");
    setOtp("");
    setMode("verify");
    setResendCooldown(45);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Digite os 6 dígitos do código.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "signup",
    });
    setLoading(false);
    if (error) return toast.error(friendlyAuthError(error.message));
    if (!data.session) {
      toast.error("Não foi possível ativar a sessão. Tente entrar novamente.");
      setMode("login");
      return;
    }
    toast.success("Conta verificada! Bem-vindo.");
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setLoading(false);
    if (error) return toast.error(friendlyAuthError(error.message));
    toast.success("Novo código enviado para o seu e-mail.");
    setResendCooldown(45);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Enviamos um link de recuperação para o seu e-mail.");
    setMode("login");
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return toast.error("Não foi possível entrar com Google.");
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  const title =
    mode === "forgot"
      ? "Recuperar senha"
      : mode === "verify"
        ? "Verificar e-mail"
        : mode === "signup"
          ? "Criar sua conta"
          : "Bem-vindo de volta";

  const subtitle =
    mode === "forgot"
      ? "Informe seu e-mail para receber o link de redefinição."
      : mode === "verify"
        ? `Digite o código de 6 dígitos enviado para ${email}.`
        : mode === "signup"
          ? "Cadastre-se para acessar o painel da sua farmácia."
          : "Acesse o painel de gestão da sua farmácia.";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-100">
      {/* Soft radial glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-teal-300/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 h-96 w-[46rem] -translate-x-1/2 rounded-full bg-sky-300/20 blur-3xl"
      />

      {/* Floating health icons */}
      <FloatingIcon icon={<Pill className="h-5 w-5" />} className="left-[8%] top-[18%]" delay="0s" />
      <FloatingIcon
        icon={<Heart className="h-5 w-5" />}
        className="right-[10%] top-[24%]"
        delay="1.2s"
      />
      <FloatingIcon
        icon={<Stethoscope className="h-5 w-5" />}
        className="left-[12%] bottom-[28%]"
        delay="2.4s"
      />
      <FloatingIcon
        icon={<Shield className="h-5 w-5" />}
        className="right-[8%] bottom-[22%]"
        delay="0.6s"
      />
      <FloatingIcon
        icon={<Cross className="h-4 w-4" />}
        className="left-[45%] top-[10%]"
        delay="1.8s"
      />

      {/* ECG wave at the bottom */}
      <EcgWave />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-teal-700/80">
              Drogaria Joncon
            </div>
            <h1 className="text-3xl font-semibold text-slate-900">PharmaERP</h1>
            <p className="mt-1 text-sm text-slate-600">Gestão completa da sua farmácia</p>
          </div>

          {/* Card */}
          <div className="relative rounded-3xl border border-white/60 bg-white/95 p-6 shadow-[0_20px_60px_-25px_rgba(13,148,136,0.35)] backdrop-blur-xl sm:p-8">
            {/* Medical cross emblem */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30 ring-4 ring-white">
                <MedicalCross className="h-8 w-8" />
              </div>
            </div>

            <div className="mt-6 text-center">
              <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>

            <div className="mt-6">
              {mode === "verify" ? (
                <form onSubmit={handleVerify} className="space-y-5">
                  <div className="flex justify-center py-1">
                    <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
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
                  <TealButton type="submit" disabled={loading || otp.length !== 6}>
                    {loading ? "Verificando..." : "Verificar código"}
                  </TealButton>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                    onClick={handleResend}
                    disabled={loading || resendCooldown > 0}
                  >
                    {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar código"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtp("");
                      setMode("login");
                    }}
                    className="mx-auto flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Usar outro e-mail
                  </button>
                </form>
              ) : mode === "forgot" ? (
                <form onSubmit={handleForgot} className="space-y-5">
                  <FloatingField
                    id="forgot-email"
                    label="E-mail"
                    icon={<Mail className="h-4 w-4" />}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@drogaria.com"
                  />
                  <TealButton type="submit" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar link de redefinição"}
                  </TealButton>
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="mx-auto flex items-center gap-1 text-sm text-slate-500 hover:text-teal-700"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Voltar para o login
                  </button>
                </form>
              ) : mode === "signup" ? (
                <form onSubmit={handleSignup} className="space-y-4">
                  <FloatingField
                    id="signup-nome"
                    label="Nome completo"
                    icon={<UserIcon className="h-4 w-4" />}
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                  />
                  <FloatingField
                    id="signup-email"
                    label="E-mail"
                    icon={<Mail className="h-4 w-4" />}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@drogaria.com"
                  />
                  <FloatingField
                    id="signup-password"
                    label="Senha"
                    icon={<Lock className="h-4 w-4" />}
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <TealButton type="submit" disabled={loading}>
                    {loading ? "Criando..." : "Criar conta"}
                  </TealButton>
                  <SocialDivider />
                  <GoogleButton onClick={handleGoogle} />
                  <p className="text-center text-sm text-slate-500">
                    Já tem uma conta?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      Entrar
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <FloatingField
                    id="login-email"
                    label="E-mail"
                    icon={<Mail className="h-4 w-4" />}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@drogaria.com"
                  />
                  <div className="space-y-1.5">
                    <FloatingField
                      id="login-password"
                      label="Senha"
                      icon={<Lock className="h-4 w-4" />}
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs font-medium text-teal-700 hover:underline"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                  </div>
                  <TealButton type="submit" disabled={loading}>
                    {loading ? "Entrando..." : "Entrar"}
                  </TealButton>
                  <SocialDivider />
                  <GoogleButton onClick={handleGoogle} />
                  <p className="text-center text-sm text-slate-500">
                    Não tem uma conta?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      Cadastre-se
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Protegido por criptografia e boas práticas de segurança em saúde.
          </p>
        </div>
      </div>
    </div>
  );
}

function TealButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition-all",
        "hover:from-teal-600 hover:to-cyan-600 hover:shadow-teal-500/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      {children}
    </button>
  );
}

function SocialDivider() {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-slate-200" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-widest">
        <span className="bg-white px-3 text-slate-400">ou continue com</span>
      </div>
    </div>
  );
}

function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
    >
      <GoogleIcon className="h-4 w-4" />
      Continuar com Google
    </button>
  );
}

function FloatingField({
  id,
  label,
  icon,
  ...props
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-slate-600">
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <Input
          id={id}
          {...props}
          className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-teal-500 focus-visible:ring-2 focus-visible:ring-teal-400/40"
        />
      </div>
    </div>
  );
}

function FloatingIcon({
  icon,
  className,
  delay,
}: {
  icon: React.ReactNode;
  className?: string;
  delay?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute hidden animate-[floaty_6s_ease-in-out_infinite] rounded-2xl bg-white/60 p-2.5 text-teal-600 shadow-sm ring-1 ring-teal-100 backdrop-blur-sm sm:block",
        className,
      )}
      style={{ animationDelay: delay }}
    >
      {icon}
    </div>
  );
}

function EcgWave() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-0 select-none">
      <svg
        viewBox="0 0 1440 180"
        preserveAspectRatio="none"
        className="h-40 w-full sm:h-48"
        fill="none"
      >
        <defs>
          <linearGradient id="ecgStroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgb(20 184 166 / 0)" />
            <stop offset="20%" stopColor="rgb(20 184 166 / 0.9)" />
            <stop offset="80%" stopColor="rgb(6 182 212 / 0.9)" />
            <stop offset="100%" stopColor="rgb(6 182 212 / 0)" />
          </linearGradient>
          <linearGradient id="ecgFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(20 184 166 / 0.18)" />
            <stop offset="100%" stopColor="rgb(20 184 166 / 0)" />
          </linearGradient>
        </defs>
        <path
          d="M0,120 L120,120 L160,120 L180,80 L200,150 L220,60 L240,120 L360,120 L400,120 L420,90 L440,140 L460,70 L480,120 L640,120 L680,120 L700,60 L720,160 L740,50 L760,120 L900,120 L940,120 L960,90 L980,150 L1000,70 L1020,120 L1200,120 L1240,120 L1260,80 L1280,150 L1300,60 L1320,120 L1440,120 L1440,180 L0,180 Z"
          fill="url(#ecgFill)"
        />
        <path
          d="M0,120 L120,120 L160,120 L180,80 L200,150 L220,60 L240,120 L360,120 L400,120 L420,90 L440,140 L460,70 L480,120 L640,120 L680,120 L700,60 L720,160 L740,50 L760,120 L900,120 L940,120 L960,90 L980,150 L1000,70 L1020,120 L1200,120 L1240,120 L1260,80 L1280,150 L1300,60 L1320,120 L1440,120"
          stroke="url(#ecgStroke)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <style>{`
        @keyframes floaty {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

function MedicalCross({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M9 3.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 3.5V9h5.5A1.5 1.5 0 0 1 22 10.5v3a1.5 1.5 0 0 1-1.5 1.5H15v5.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 20.5V15H3.5A1.5 1.5 0 0 1 2 13.5v-3A1.5 1.5 0 0 1 3.5 9H9V3.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.75-6-6.15S8.7 5.9 12 5.9c1.9 0 3.15.8 3.87 1.5l2.64-2.55C16.85 3.35 14.6 2.4 12 2.4 6.75 2.4 2.5 6.65 2.5 12s4.25 9.6 9.5 9.6c5.48 0 9.11-3.85 9.11-9.27 0-.62-.07-1.09-.15-1.55H12z"
      />
      <path
        fill="#34A853"
        d="M3.88 7.35 6.9 9.55C7.75 7.6 9.7 6.15 12 6.15c1.55 0 2.95.55 4.05 1.6l2.9-2.9C17.05 3.05 14.7 2 12 2 8.05 2 4.65 4.15 3.88 7.35z"
        opacity="0"
      />
    </svg>
  );
}
