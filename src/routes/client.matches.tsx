import { createFileRoute, Link } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchRankedTrainers } from "@/lib/trainers";
import { TrainerCard } from "@/components/trainers/TrainerCard";
import { Calendar, Loader2 } from "lucide-react";

export const Route = createFileRoute("/client/matches")({
  component: () => (
    <RoleGuard role="client">
      <Matches />
    </RoleGuard>
  ),
});

function Matches() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: ranked, isLoading } = useQuery({
    queryKey: ["matches", profile?.id, profile?.fitness_goal],
    queryFn: () =>
      fetchRankedTrainers({
        fitness_goal: profile?.fitness_goal,
        budget_min: profile?.budget_min,
        budget_max: profile?.budget_max,
        preferred_trainer_gender: profile?.preferred_trainer_gender,
        preferred_experience: profile?.preferred_experience,
        experience_level: profile?.experience_level,
        latitude: profile?.latitude,
        longitude: profile?.longitude,
        training_style_pref: profile?.preferred_style,
        sessions_per_week_pref: profile?.sessions_per_week,
        training_modality_pref: profile?.training_modality,
      }),
    enabled: !!profile,
  });

  const top = (ranked ?? []).filter((r) => r.match.score >= 60);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold">แมตช์ AI ของคุณ</h1>
        <p className="mt-2 text-muted-foreground">
          เทรนเนอร์ที่จัดอันดับตามความเข้ากันกับเป้าหมายของคุณ
        </p>
      </div>
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : top.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          No strong matches yet — complete your profile or browse all trainers.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((t) => (
            <div key={t.user_id} className="space-y-2">
              <TrainerCard trainer={t} match={t.match} />
              <div className="rounded-lg border border-border bg-card p-4 text-xs">
                <div className="mb-3 font-semibold uppercase tracking-widest text-primary flex items-center justify-between">
                  <span>วิเคราะห์ความเข้ากัน</span>
                  <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded text-primary">
                    คะแนน {t.match.score}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {t.match.breakdown
                    .filter((b) => b.isMatch)
                    .map((b) => (
                      <div
                        key={b.label}
                        className="flex items-center gap-1.5 bg-surface rounded-full px-3 py-1 border border-border"
                      >
                        <span className="text-primary font-bold">✓</span>
                        <span className="text-muted-foreground font-medium">{b.text}</span>
                      </div>
                    ))}
                </div>
                {t.match.reasons.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <ul className="space-y-1 text-muted-foreground italic">
                      {t.match.reasons.slice(0, 2).map((r) => (
                        <li key={r}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Link
                  to="/client/trainer/$id"
                  params={{ id: t.user_id }}
                  className="mt-4 flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                >
                  <Calendar className="h-4 w-4" />
                  จองเซสชันเพื่อเปิดแชท
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
