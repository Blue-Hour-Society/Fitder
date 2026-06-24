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
          <div className="hidden items-center gap-8 text-sm md:flex">
            <Link to="/about" className="text-muted-foreground hover:text-foreground">
              {t("common.about")}
            </Link>
            <a href="#how" className="text-muted-foreground hover:text-foreground">
              {t("common.how_it_works")}
            </a>
            <a href="#features" className="text-muted-foreground hover:text-foreground">
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
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs uppercase tracking-widest text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" />
            AI-Powered Trainer Matching
          </div>
          <h1 className="mx-auto max-w-4xl font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl lg:text-8xl">
            {t("landing.hero_title").split("perfect").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && <span className="text-gradient-lime">perfect</span>}
              </span>
            ))}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
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
            <div className="text-xs uppercase tracking-widest text-primary">Platform</div>
            <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">
              Everything you need to train smarter.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "AI Matching",
                body: "Compatibility scoring across goals, budget, distance, schedule, and experience.",
              },
              {
                icon: Calendar,
                title: "Instant Booking",
                body: "Real-time availability with double-booking protection and live status updates.",
              },
              {
                icon: Activity,
                title: "Pose Correction",
                body: "Train with built-in posture feedback. Track your form score over time.",
              },
              {
                icon: MapPin,
                title: "Nearby Trainers",
                body: "Distance-aware discovery surfaces coaches in your area, sorted by relevance.",
              },
              {
                icon: CheckCircle2,
                title: "Verified Coaches",
                body: "Admin-vetted profiles with certifications, specialties, and client reviews.",
              },
              {
                icon: Dumbbell,
                title: "All Goals",
                body: "Weight loss, muscle gain, strength, recomposition — find a specialist.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border bg-card p-6 transition hover:border-primary/50"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <div className="text-xs uppercase tracking-widest text-primary">How it works</div>
            <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">
              Three steps to your next session.
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              ["01", "Set your goals", "Tell us your goal, budget, and schedule."],
              ["02", "Get matched", "See ranked trainers with compatibility scores."],
              ["03", "Book & train", "Pick a slot, get confirmed, start training."],
            ].map(([n, t, d]) => (
              <div key={n} className="relative rounded-xl border border-border bg-card p-8">
                <div className="font-display text-6xl font-bold text-primary/30">{n}</div>
                <h3 className="mt-4 font-display text-xl font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-20 text-center">
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            Ready to find your coach?
          </h2>
          <Link
            to={user ? dashHref : "/register"}
            className="rounded-md bg-background px-7 py-3.5 font-display text-base font-bold text-foreground transition hover:opacity-90"
          >
            Get started — it's free
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-background py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Fitder</span>
          <Link to="/about" className="hover:text-foreground">About</Link>
        </div>
      </footer>
    </div>
  );
}
