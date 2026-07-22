import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Dumbbell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Logo } from "@/components/layout/Logo";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Fitder" }] }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const redirectAfterLogin = async () => {
      if (!user || !role) return;

      setCheckingProfile(true);
      const target = await getPostLoginRoute(user.id, role);

      if (!cancelled) {
        setCheckingProfile(false);
        nav({ to: target as never });
      }
    };

    redirectAfterLogin();

    return () => {
      cancelled = true;
    };
  }, [user, role, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success(t("auth.welcome_back"));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <Logo className="h-9 w-9" iconClassName="h-5 w-5" />
          <span className="font-display text-xl font-bold">Fitder</span>
        </Link>
        <h1 className="font-display text-3xl font-bold">{t("auth.welcome_to_fitder")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("auth.login_subtitle")}</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              {t("auth.email")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              {t("auth.password")}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <button
            disabled={loading || checkingProfile}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 font-display font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {(loading || checkingProfile) && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("auth.sign_in")}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("auth.new_here")}{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            {t("auth.create_account")}
          </Link>
        </p>
      </div>
    </div>
  );
}

async function getPostLoginRoute(userId: string, role: string) {
  try {
    if (role === "client") {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "full_name, fitness_goal, budget_max, experience_level, training_modality, sessions_per_week",
        )
        .eq("id", userId)
        .maybeSingle();

      if (error || isClientProfileComplete(data)) return "/client/dashboard";
      return "/client/profile";
    }

    if (role === "trainer") {
      const [
        { data: profile, error: profileError },
        { data: trainerProfile, error: trainerError },
      ] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
        supabase
          .from("trainer_profiles")
          .select(
            "bio, specialties, experience_years, price_per_session, gym_name, training_location, training_modality",
          )
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (profileError || trainerError || isTrainerProfileComplete(profile, trainerProfile)) {
        return "/trainer/dashboard";
      }
      return "/trainer/profile";
    }
  } catch {
    return `/${role}/dashboard`;
  }

  return `/${role}/dashboard`;
}

function isClientProfileComplete(profile: Record<string, unknown> | null) {
  return Boolean(
    hasText(profile?.full_name) &&
    profile?.fitness_goal &&
    profile?.budget_max &&
    profile?.experience_level &&
    profile?.training_modality &&
    profile?.sessions_per_week,
  );
}

function isTrainerProfileComplete(
  profile: Record<string, unknown> | null,
  trainerProfile: Record<string, unknown> | null,
) {
  return Boolean(
    hasText(profile?.full_name) &&
    hasText(trainerProfile?.bio) &&
    hasItems(trainerProfile?.specialties) &&
    Number(trainerProfile?.experience_years ?? 0) > 0 &&
    Number(trainerProfile?.price_per_session ?? 0) > 0 &&
    (hasText(trainerProfile?.gym_name) || hasText(trainerProfile?.training_location)) &&
    hasItems(trainerProfile?.training_modality),
  );
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasItems(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}
