import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchRankedTrainers } from "@/lib/trainers";
import { TrainerCard } from "@/components/trainers/TrainerCard";
import { Loader2, Search } from "lucide-react";
import { formatTHB } from "@/lib/currency";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/client/discover")({
  component: () => (
    <RoleGuard role="client">
      <Discover />
    </RoleGuard>
  ),
});

function Discover() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [maxPrice, setMaxPrice] = useState(2000);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<"match" | "price" | "rating">("match");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: trainers, isLoading } = useQuery({
    queryKey: ["all-trainers", profile?.id],
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

  const filtered = useMemo(() => {
    const list = (trainers ?? []).filter((t) => {
      if (q && !(t.full_name ?? "").toLowerCase().includes(q.toLowerCase())) return false;
      if ((t.price_per_session ?? 0) > maxPrice) return false;
      if ((t.rating ?? 0) < minRating) return false;
      return true;
    });
    if (sortBy === "price") list.sort((a, b) => (a.price_per_session ?? 0) - (b.price_per_session ?? 0));
    else if (sortBy === "rating") list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return list;
  }, [trainers, q, maxPrice, minRating, sortBy]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold">ค้นหาเทรนเนอร์</h1>
        <p className="mt-2 text-muted-foreground">ค้นหา กรอง และเลือกเทรนเนอร์ที่เหมาะกับคุณ</p>
      </div>

      <div className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">ค้นหา</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search by name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">ราคาสูงสุด {formatTHB(maxPrice)}</label>
          <input type="range" min={0} max={2000} step={50} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="mt-2 w-full accent-primary" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">เรียงตาม</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "match")} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
            <option value="match">ตรงใจที่สุด</option>
            <option value="price">ราคาต่ำสุด</option>
            <option value="rating">คะแนนสูงสุด</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">ไม่พบเทรนเนอร์ที่ตรงกับตัวกรอง</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((t) => <TrainerCard key={t.user_id} trainer={t} match={t.match} />)}
        </div>
      )}
    </div>
  );
}
