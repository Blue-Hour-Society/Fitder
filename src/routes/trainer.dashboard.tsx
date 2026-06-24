import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Users, Wallet, Gift, Zap } from "lucide-react";
import { DailyReward } from "@/components/auth/DailyReward";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatTHB } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/trainer/dashboard")({
  component: () => <RoleGuard role="trainer"><Dash /></RoleGuard>,
});

function Dash() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["trainer-dash", user?.id],
    queryFn: async () => {
      const [{ data: bookings }, { data: slots }, { data: profile }, { data: trainerProfile }] = await Promise.all([
        supabase.from("bookings").select("id, booking_status, total_price, commission_amount, net_amount, client_id").eq("trainer_id", user!.id),
        supabase.from("availability_slots").select("id, is_booked").eq("trainer_id", user!.id),
        supabase.from("profiles").select("reward_points").eq("id", user!.id).maybeSingle(),
        supabase.from("trainer_profiles").select("auto_accept").eq("user_id", user!.id).maybeSingle(),
      ]);
      return { 
        bookings: bookings ?? [], 
        slots: slots ?? [], 
        profile,
        autoAccept: trainerProfile?.auto_accept ?? false
      };
    },
    enabled: !!user,
  });

  const updateAutoAccept = useMutation({
    mutationFn: async (checked: boolean) => {
      const { error } = await supabase
        .from("trainer_profiles")
        .update({ auto_accept: checked } as any)
        .eq("user_id", user!.id);
      if (error) throw error;
      return checked;
    },
    onSuccess: (checked) => {
      queryClient.invalidateQueries({ queryKey: ["trainer-dash", user?.id] });
      toast.success(checked ? "เปิดรับอัตโนมัติแล้ว" : "ปิดรับอัตโนมัติแล้ว");
    },
    onError: (error: any) => {
      toast.error(error.message || "อัปเดตการตั้งค่าไม่สำเร็จ");
    },
  });

  const b = data?.bookings ?? [];
  const earnedBookings = b.filter((x) => x.booking_status === "completed" || x.booking_status === "accepted");
  const stats = {
    pending: b.filter((x) => x.booking_status === "pending").length,
    accepted: b.filter((x) => x.booking_status === "accepted").length,
    clients: new Set(b.map((x) => x.client_id)).size,
    grossEarnings: earnedBookings.reduce((s, x) => s + Number(x.total_price ?? 0), 0),
    netEarnings: earnedBookings.reduce((s, x) => {
      const gross = Number(x.total_price ?? 0);
      const net = x.net_amount !== null && x.net_amount !== undefined 
        ? Number(x.net_amount) 
        : gross * 0.9; 
      return s + net;
    }, 0),
    rewardPoints: data?.profile?.reward_points ?? 0,
  };

  return (
    <div className="space-y-8">
      <DailyReward />
      <div>
        <div className="text-xs uppercase tracking-widest text-primary">แดชบอร์ดเทรนเนอร์</div>
        <h1 className="mt-1 font-display text-4xl font-bold">ภาพรวมวันนี้</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Stat label="คำขอที่รออนุมัติ" value={stats.pending} icon={Clock} />
        <Stat label="เซสชันที่ยืนยันแล้ว" value={stats.accepted} icon={Calendar} />
        <Stat label="ลูกค้าไม่ซ้ำ" value={stats.clients} icon={Users} />
        <Stat 
          label="รายได้สุทธิ" 
          value={formatTHB(stats.netEarnings)} 
          icon={Wallet} 
          subValue={`ยอดรวม: ${formatTHB(stats.grossEarnings)}`}
        />
        <Stat label="แต้มรางวัล" value={stats.rewardPoints} icon={Gift} />
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold">ทางลัด</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            จัดการเวลาว่างเพื่อรับการจองเพิ่ม หรือดูคำขอที่รออนุมัติ
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                รับลูกค้าอัตโนมัติ
              </h2>
              <p className="text-sm text-muted-foreground">
                อนุมัติคำขอจองใหม่ทั้งหมดโดยอัตโนมัติ
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="auto-accept" 
                checked={data?.autoAccept ?? false}
                onCheckedChange={(checked) => updateAutoAccept.mutate(checked)}
                disabled={updateAutoAccept.isPending}
              />
              <Label htmlFor="auto-accept">
                {data?.autoAccept ? "เปิด" : "ปิด"}
              </Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, subValue }: { label: string; value: string | number; icon: typeof Clock; subValue?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
        {label} <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 font-display text-3xl font-bold">{value}</div>
      {subValue && <div className="mt-1 text-xs text-muted-foreground">{subValue}</div>}
    </div>
  );
}
