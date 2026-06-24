import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User } from "lucide-react";
import { goalTh } from "@/lib/thai-labels";

export const Route = createFileRoute("/trainer/clients")({
  component: () => <RoleGuard role="trainer"><C /></RoleGuard>,
});

function C() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["trainer-clients", user?.id],
    queryFn: async () => {
      const { data: bookings } = await supabase.from("bookings").select("client_id, booking_status").eq("trainer_id", user!.id).in("booking_status", ["accepted", "completed"]);
      const ids = [...new Set((bookings ?? []).map((b) => b.client_id))];
      if (ids.length === 0) return [];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email, avatar_url, fitness_goal").in("id", ids);
      return profs ?? [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold">ลูกค้าของฉัน</h1>
        <p className="mt-2 text-muted-foreground">ลูกค้าที่คุณเคยฝึกหรือรับการจองแล้ว</p>
      </div>
      {isLoading ? <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        : !data || data.length === 0 ? <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">ยังไม่มีลูกค้า</div>
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <div key={c.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary"><User className="h-5 w-5" /></div>
              <div>
                <div className="font-display font-semibold">{c.full_name}</div>
                <div className="text-xs text-muted-foreground">{c.email}</div>
                {c.fitness_goal && <div className="mt-1 text-xs text-primary">{goalTh(c.fitness_goal)}</div>}
              </div>
            </div>
          ))}
        </div>}
    </div>
  );
}
