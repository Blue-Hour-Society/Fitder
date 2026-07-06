import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Dumbbell,
  Sparkles,
  Calendar,
  Activity,
  MapPin,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Logo } from "@/components/layout/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fitder — Smart Personal Trainer Matching" },
      {
        name: "description",
        content:
          "AI-matched personal trainers, instant booking, and live posture correction. Train smarter with Fitder.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, role } = useAuth();
  const { t } = useTranslation();
  const dashHref = role ? `/${role}/dashboard` : "/login";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-display text-xl font-bold tracking-tight">
              Fitder
            </span>
          </Link>
          <div className="hidden items-center gap-10 text-base md:flex">
            <a href="#about" className="text-muted-foreground transition hover:text-foreground">
              {t("common.about")}
            </a>
            <a href="#how" className="text-muted-foreground transition hover:text-foreground">
              {t("common.how_it_works")}
            </a>
            <a href="#features" className="text-muted-foreground transition hover:text-foreground">
              {t("common.features")}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {user ? (
              <Link
                to={dashHref}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                {t("common.dashboard")}
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
                  {t("common.login")}
                </Link>
                <Link
                  to="/register"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  {t("common.get_started")}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute left-1/2 top-0 -z-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-primary/20 blur-[160px]" />
        <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-28 text-center lg:pt-32 lg:pb-40">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-sm tracking-wide text-muted-foreground backdrop-blur">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("landing.hero_badge")}
          </div>
          <h1 className="mx-auto max-w-4xl font-display text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
            {t("landing.hero_title_1")}
            <span className="text-gradient-lime">{t("landing.hero_highlight")}</span>
            {t("landing.hero_title_2")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {t("landing.hero_subtitle")}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to={user ? dashHref : "/register"}
              className="group inline-flex items-center gap-2 rounded-md bg-primary px-7 py-3.5 font-display text-base font-bold text-primary-foreground transition hover:opacity-90"
            >
              {t("common.find_your_trainer")}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-7 py-3.5 font-display text-base font-semibold text-foreground transition hover:border-primary/50"
            >
              {t("common.im_a_trainer")}
            </Link>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-20 grid max-w-3xl grid-cols-3 gap-6 border-t border-border pt-10">
            {[
              ["500+", "Coaches"],
              ["12K", "Sessions"],
              ["4.9★", "Avg. Rating"],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="font-display text-3xl font-bold md:text-4xl">{n}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-surface/30 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 max-w-2xl">
            <div className="text-sm tracking-wide text-primary">{t("common.features")}</div>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
              {t("landing.features_title")}
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: t("landing.feature_1_title"),
                body: t("landing.feature_1_desc"),
              },
              {
                icon: Calendar,
                title: t("landing.feature_2_title"),
                body: t("landing.feature_2_desc"),
              },
              {
                icon: Activity,
                title: t("landing.feature_3_title"),
                body: t("landing.feature_3_desc"),
              },
              {
                icon: MapPin,
                title: t("landing.feature_4_title"),
                body: t("landing.feature_4_desc"),
              },
              {
                icon: CheckCircle2,
                title: t("landing.feature_5_title"),
                body: t("landing.feature_5_desc"),
              },
              {
                icon: Dumbbell,
                title: t("landing.feature_6_title"),
                body: t("landing.feature_6_desc"),
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group rounded-xl border border-border bg-background p-6 transition hover:border-primary/50"
              >
                <feature.icon className="mb-4 h-6 w-6 text-primary" />
                <h3 className="font-display text-lg font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="text-sm tracking-wide text-primary">{t("landing.how_title")}</div>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
              {t("landing.how_heading")}
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              ["01", t("landing.step_1_title"), t("landing.step_1_desc")],
              ["02", t("landing.step_2_title"), t("landing.step_2_desc")],
              ["03", t("landing.step_3_title"), t("landing.step_3_desc")],
            ].map(([n, tStr, d]) => (
              <div key={n} className="relative rounded-xl border border-border bg-card p-8">
                <div className="font-display text-6xl font-bold text-primary/30">{n}</div>
                <h3 className="mt-4 font-display text-xl font-semibold">{tStr}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-t border-border bg-surface/30 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="text-sm tracking-wide text-primary">{t("common.about")}</div>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
            {t("landing.about_title")}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            {t("landing.about_mission_desc")}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-20 text-center">
          <h2 className="font-display text-4xl font-bold leading-tight md:text-5xl">
            {t("landing.cta_heading")}
          </h2>
          <Link
            to={user ? dashHref : "/register"}
            className="rounded-md bg-background px-7 py-3.5 font-display text-base font-bold text-foreground transition hover:opacity-90"
          >
            {t("landing.cta_button")}
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-background py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Fitder</span>
          <a href="#about" className="transition hover:text-foreground">{t("common.about")}</a>
        </div>
      </footer>
    </div>
  );
}
