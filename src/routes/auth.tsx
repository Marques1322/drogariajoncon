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
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Drogaria Joncon" },
      { name: "description", content: "Acesse o ERP de gestão da Drogaria Joncon." },
      { property: "og:title", content: "Drogaria Joncon — Portal de acesso" },
      { property: "og:description", content: "Sistema premium de gestão farmacêutica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
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
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
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
    if (error) return toast.error(friendlyAuthError(error.message));
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
    if (otp.length !== 6) return toast.error("Digite os 6 dígitos do código.");
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: "signup" });
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
    toast.success("Novo código enviado.");
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
      ? "Informe seu e-mail para receber o link."
      : mode === "verify"
        ? `Digite o código de 6 dígitos enviado para ${email}.`
        : mode === "signup"
          ? "Cadastre-se para acessar o painel Joncon."
          : "Acesse o painel de gestão da farmácia.";

  return (
    <div className="min-h-screen w-full bg-[#111111] lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* ===== LEFT PANEL — brand ===== */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-20">
        {/* Gradient wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(60% 45% at 20% 15%, rgba(249,115,22,0.28) 0%, transparent 60%)," +
              "radial-gradient(50% 50% at 90% 90%, rgba(230,74,25,0.22) 0%, transparent 60%)," +
              "linear-gradient(180deg, #111111 0%, #171717 50%, #111111 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <FloatingIcon
          icon={<Pill className="h-4 w-4" />}
          className="left-[14%] top-[22%]"
          delay="0s"
        />
        <FloatingIcon
          icon={<Heart className="h-4 w-4" />}
          className="right-[18%] top-[28%]"
          delay="1.2s"
        />
        <FloatingIcon
          icon={<Stethoscope className="h-4 w-4" />}
          className="left-[10%] bottom-[30%]"
          delay="2.4s"
        />
        <FloatingIcon
          icon={<Shield className="h-4 w-4" />}
          className="right-[12%] bottom-[22%]"
          delay="0.6s"
        />
        <FloatingIcon
          icon={<Cross className="h-4 w-4" />}
          className="left-[52%] top-[16%]"
          delay="1.8s"
        />

        {/* Top: logo */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl joncon-gradient shadow-xl shadow-orange-500/30">
            <span className="text-3xl font-black text-white">J</span>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-white">Drogaria Joncon</div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[#F97316]">
              Cuidando de você
            </div>
          </div>
        </div>

        {/* Middle: slogan */}
        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-white xl:text-6xl">
            Saúde, <span className="joncon-gradient bg-clip-text text-transparent">precisão</span>
            <br /> e confiança.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            Sistema premium de gestão farmacêutica — do balcão ao estoque, do PDV ao financeiro.
            Tudo em um só lugar.
          </p>
          <EcgWave className="mt-10" />
        </div>

        {/* Bottom: highlights */}
        <div className="relative z-10 grid grid-cols-3 gap-4 text-sm">
          {[
            { k: "PDV", v: "Rápido" },
            { k: "Estoque", v: "Em tempo real" },
            { k: "Relatórios", v: "BI integrado" },
          ].map((it) => (
            <div
              key={it.k}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur"
            >
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[#F97316]">
                {it.k}
              </div>
              <div className="mt-1 font-medium text-white">{it.v}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* ===== RIGHT PANEL — form (white card) ===== */}
      <section className="relative flex min-h-screen items-center justify-center bg-white px-4 py-10 sm:px-8 sm:py-16">
        {/* Mobile brand */}
        <div className="absolute left-1/2 top-6 flex -translate-x-1/2 items-center gap-2 lg:hidden">
          <div className="grid h-10 w-10 place-items-center rounded-xl joncon-gradient shadow-lg shadow-orange-500/30">
            <span className="text-lg font-black text-white">J</span>
          </div>
          <div className="text-sm font-bold tracking-tight text-zinc-900">Drogaria Joncon</div>
        </div>

        <div className="w-full max-w-md animate-fade-in">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#F97316]">
              Portal de acesso
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900">{title}</h2>
            <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>
          </div>

          {mode === "verify" ? (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <OrangeButton type="submit" disabled={loading || otp.length !== 6}>
                {loading ? "Verificando..." : "Verificar código"}
              </OrangeButton>
              <button
                type="button"
                onClick={handleResend}
                disabled={loading || resendCooldown > 0}
                className="h-11 w-full rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 transition-all hover:border-[#F97316] hover:text-[#F97316] disabled:opacity-60"
              >
                {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar código"}
              </button>
              <BackLink
                onClick={() => {
                  setOtp("");
                  setMode("login");
                }}
              >
                Usar outro e-mail
              </BackLink>
            </form>
          ) : mode === "forgot" ? (
            <form onSubmit={handleForgot} className="space-y-5">
              <BigField
                id="forgot-email"
                label="E-mail"
                icon={<Mail className="h-4 w-4" />}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@drogariajoncon.com"
              />
              <OrangeButton type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar link de redefinição"}
              </OrangeButton>
              <BackLink onClick={() => setMode("login")}>Voltar para o login</BackLink>
            </form>
          ) : mode === "signup" ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <BigField
                id="signup-nome"
                label="Nome completo"
                icon={<UserIcon className="h-4 w-4" />}
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
              />
              <BigField
                id="signup-email"
                label="E-mail"
                icon={<Mail className="h-4 w-4" />}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@drogariajoncon.com"
              />
              <BigField
                id="signup-password"
                label="Senha"
                icon={<Lock className="h-4 w-4" />}
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                trailing={
                  <PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                }
              />
              <OrangeButton type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar conta"}
              </OrangeButton>
              <Divider />
              <GoogleButton onClick={handleGoogle} />
              <p className="text-center text-sm text-zinc-500">
                Já tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-semibold text-[#F97316] hover:underline"
                >
                  Entrar
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <BigField
                id="login-email"
                label="Usuário"
                icon={<Mail className="h-4 w-4" />}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@drogariajoncon.com"
              />
              <BigField
                id="login-password"
                label="Senha"
                icon={<Lock className="h-4 w-4" />}
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                trailing={
                  <PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                }
              />
              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex cursor-pointer items-center gap-2 text-zinc-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 accent-[#F97316]"
                  />
                  Lembrar login
                </label>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="font-medium text-zinc-600 transition-colors hover:text-[#F97316]"
                >
                  Esqueci minha senha
                </button>
              </div>
              <OrangeButton type="submit" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </OrangeButton>
              <Divider />
              <GoogleButton onClick={handleGoogle} />
              <p className="text-center text-sm text-zinc-500">
                Não tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-semibold text-[#F97316] hover:underline"
                >
                  Cadastre-se
                </button>
              </p>
            </form>
          )}

          <p className="mt-8 text-center text-xs text-zinc-400">
            © {new Date().getFullYear()} Drogaria Joncon · Protegido por criptografia
          </p>
        </div>
      </section>
    </div>
  );
}

/* ============ subcomponents ============ */

function OrangeButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-white",
        "joncon-gradient transition-all duration-200",
        "shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:brightness-110",
        "active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}

function BigField({
  id,
  label,
  icon,
  trailing,
  ...props
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </Label>
      <div className="group relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-[#F97316]">
          {icon}
        </span>
        <input
          id={id}
          {...props}
          className={cn(
            "h-12 w-full rounded-xl border border-zinc-200 bg-white pl-11 pr-11 text-sm text-zinc-900 shadow-sm",
            "placeholder:text-zinc-400 transition-all",
            "hover:border-zinc-300",
            "focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20",
          )}
        />
        {trailing && <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
    </div>
  );
}

function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-[#F97316]"
      aria-label={show ? "Ocultar senha" : "Mostrar senha"}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

function Divider() {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-zinc-200" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white px-3 text-[11px] uppercase tracking-[0.24em] text-zinc-400">
          ou continue com
        </span>
      </div>
    </div>
  );
}

function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:border-[#F97316] hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/30"
    >
      <GoogleIcon className="h-4 w-4" />
      Continuar com Google
    </button>
  );
}

function BackLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-[#F97316]"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {children}
    </button>
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
    <span
      aria-hidden
      className={cn(
        "absolute grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-[#F97316] backdrop-blur",
        "animate-[joncon-float_6s_ease-in-out_infinite]",
        className,
      )}
      style={{ animationDelay: delay ?? "0s" }}
    >
      {icon}
      <style>{`@keyframes joncon-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </span>
  );
}

function EcgWave({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 80"
      preserveAspectRatio="none"
      aria-hidden
      className={cn("h-10 w-full max-w-lg text-[#F97316]", className)}
    >
      <path
        d="M0 40 L120 40 L140 20 L160 60 L180 40 L240 40 L260 10 L280 70 L300 40 L360 40 L380 20 L400 60 L420 40 L600 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <animate
          attributeName="stroke-dasharray"
          from="0 1200"
          to="1200 0"
          dur="3.5s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.62l6.87-6.87C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
