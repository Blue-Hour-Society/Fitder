import { createFileRoute, Link } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchRankedTrainers } from "@/lib/trainers";
import { TrainerCard } from "@/components/trainers/TrainerCard";
import { Sparkles, Calendar, Activity, ArrowRight, Loader2, Gift } from "lucide-react";
import { DailyReward } from "@/components/auth/DailyReward";
import { goalTh } from "@/lib/thai-labels";

export const Route = createFileRoute("/client/dashboard")({
  component: () => (
    <RoleGuard role="client">
      <ClientDashboard />
    </RoleGuard>
  ),
});

function ClientDashboard() {
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
    queryKey: ["ranked-trainers", profile?.id, profile?.fitness_goal],
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

  const { data: bookings } = useQuery({
    queryKey: ["client-bookings-count", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("bookings").select("id, booking_status").eq("client_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const top = (ranked ?? []).slice(0, 6);

  return (
    <div className="space-y-8">
      <DailyReward />
      <div>
        <div className="text-xs uppercase tracking-widest text-primary">ยินดีต้อนรับกลับ</div>
        <h1 className="mt-1 font-display text-4xl font-bold">
          {profile?.full_name || "Hello"} 👋
        </h1>
        <p className="mt-2 text-muted-foreground">นี่คือเทรนเนอร์ที่เหมาะกับคุณที่สุดวันนี้</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="แต้มรางวัล" value={profile?.reward_points || 0} icon={Gift} />
        <StatCard label="แมตช์แนะนำ" value={ranked?.length ?? 0} icon={Sparkles} />
        <StatCard
          label="การจองที่ใช้งานอยู่"
          value={(bookings ?? []).filter((b) => b.booking_status === "accepted" || b.booking_status === "pending").length}
          icon={Calendar}
        />
        <StatCard label="เป้าหมาย" value={goalTh(profile?.fitness_goal)} icon={Activity} />
      </div>

      {!profile?.fitness_goal && (
        <Link
          to="/client/profile"
          className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/10 p-6 transition hover:bg-primary/15"
        >
          <div>
            <div className="font-display text-lg font-semibold">กรอกโปรไฟล์ให้ครบ</div>
            <div className="text-sm text-muted-foreground">
              ตั้งเป้าหมายและงบประมาณเพื่อให้ระบบแนะนำเทรนเนอร์ได้แม่นขึ้น
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-primary" />
        </Link>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold">แนะนำสำหรับคุณ</h2>
          <Link to="/client/discover" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : top.length === 0 ? (
          <EmptyState text="No trainers yet — check back soon." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((t) => (
              <TrainerCard key={t.user_id} trainer={t} match={t.match} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Sparkles }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 font-display text-3xl font-bold capitalize">{value}</div>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
      {text}
    </div>
  );
}
