import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pill, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";

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
  if (m.includes("invalid") && m.includes("token")) return "Código inválido. Verifique os 6 dígitos e tente novamente.";
  if (m.includes("otp")) return "Código incorreto ou expirado. Tente novamente ou reenvie.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Este e-mail já está cadastrado. Faça login.";
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-3">
            <Pill className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold">PharmaERP</h1>
          <p className="text-sm text-muted-foreground">Gestão completa da sua farmácia</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "forgot"
                ? "Recuperar senha"
                : mode === "verify"
                  ? "Verificar e-mail"
                  : "Acessar sistema"}
            </CardTitle>
            <CardDescription>
              {mode === "forgot"
                ? "Informe seu e-mail para receber o link de redefinição."
                : mode === "verify"
                  ? `Digite o código de 6 dígitos enviado para ${email}.`
                  : "Entre com seu e-mail ou conta Google."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "verify" ? (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="flex justify-center py-2">
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
                <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                  {loading ? "Verificando..." : "Verificar código"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleResend}
                  disabled={loading || resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar código"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setOtp("");
                    setMode("login");
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Usar outro e-mail
                </Button>
              </form>
            ) : mode === "forgot" ? (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">E-mail</Label>
                  <Input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar link"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("login")}>
                  Voltar
                </Button>
              </form>
            ) : (
              <>
                <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Entrar</TabsTrigger>
                    <TabsTrigger value="signup">Criar conta</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">E-mail</Label>
                        <Input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="login-password">Senha</Label>
                          <button
                            type="button"
                            onClick={() => setMode("forgot")}
                            className="text-xs text-primary hover:underline"
                          >
                            Esqueci minha senha
                          </button>
                        </div>
                        <Input id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Entrando..." : "Entrar"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignup} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-nome">Nome completo</Label>
                        <Input id="signup-nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">E-mail</Label>
                        <Input id="signup-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Senha</Label>
                        <Input id="signup-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Criando..." : "Criar conta"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full" onClick={handleGoogle} type="button">
                  Continuar com Google
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
