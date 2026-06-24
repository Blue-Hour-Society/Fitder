import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShieldCheck, Calendar, Activity, Wallet } from "lucide-react";
import { formatTHB } from "@/lib/currency";

export const Route = createFileRoute("/admin/dashboard")({
  component: A,
});

function A() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [profiles, trainers, bookings, poses, recentBookings] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("trainer_profiles").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id, total_price, commission_amount"),
        supabase.from("pose_sessions").select("id", { count: "exact", head: true }),
        supabase
          .from("bookings")
          .select("*, client:profiles!client_id(full_name)")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      
      const totalCommission = (bookings.data ?? []).reduce((sum, b) => {
        const gross = Number((b as any).total_price ?? 0);
        const comm = b.commission_amount !== null && b.commission_amount !== undefined 
          ? Number(b.commission_amount) 
          : gross * 0.1;
        return sum + comm;
      }, 0);

      return {
        users: profiles.count ?? 0,
        trainers: trainers.count ?? 0,
        bookingsCount: bookings.data?.length ?? 0,
        totalCommission,
        poses: poses.count ?? 0,
        recentBookings: recentBookings.data ?? [],
      };
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-widest text-primary">Admin</div>
        <h1 className="mt-1 font-display text-4xl font-bold">Platform overview</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <S label="Total users" value={data?.users ?? 0} icon={Users} />
        <S label="Trainers" value={data?.trainers ?? 0} icon={ShieldCheck} />
        <S label="Bookings" value={data?.bookingsCount ?? 0} icon={Calendar} />
        <S label="Commission" value={formatTHB(data?.totalCommission)} icon={Wallet} />
        <S label="Pose sessions" value={data?.poses ?? 0} icon={Activity} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Recent Bookings</h2>
          <div className="space-y-4">
            {(data?.recentBookings ?? []).map((b: any) => (
              <div key={b.id} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                <div>
                  <div className="font-semibold">{b.client?.full_name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-primary">{formatTHB(b.total_price)}</div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">{b.booking_status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Database</span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-success uppercase">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Auth Service</span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-success uppercase">
                <span className="h-2 w-2 rounded-full bg-success" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Storage</span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-success uppercase">
                <span className="h-2 w-2 rounded-full bg-success" />
                Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function S({ label, value, icon: Icon }: { label: string; value: number | string; icon: typeof Users }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="truncate">{label}</span>
        <Icon className="h-4 w-4 shrink-0 text-primary" />
      </div>
      <div className="mt-3 font-display text-2xl font-bold sm:text-3xl truncate">{value}</div>
    </div>
  );
}
