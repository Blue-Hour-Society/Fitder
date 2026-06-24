import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, TrendingUp } from "lucide-react";
import { formatTHB } from "@/lib/currency";

export const Route = createFileRoute("/trainer/earnings")({
  component: () => <RoleGuard role="trainer"><E /></RoleGuard>,
});

function E() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["earnings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("total_price, commission_amount, net_amount, booking_status, created_at")
        .eq("trainer_id", user!.id)
        .eq("booking_status", "completed");
      return data ?? [];
    },
    enabled: !!user,
  });

  const totalGross = (data ?? []).reduce((s, b) => s + Number(b.total_price ?? 0), 0);
  const totalNet = (data ?? []).reduce((s, b) => {
    const gross = Number(b.total_price ?? 0);
    const net = b.net_amount !== null && b.net_amount !== undefined 
      ? Number(b.net_amount) 
      : gross * 0.9;
    return s + net;
  }, 0);
  const totalCommission = (data ?? []).reduce((s, b) => {
    const gross = Number(b.total_price ?? 0);
    const comm = b.commission_amount !== null && b.commission_amount !== undefined 
      ? Number(b.commission_amount) 
      : gross * 0.1;
    return s + comm;
  }, 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthData = (data ?? []).filter((b) => {
    const d = new Date(b.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  
  const monthNet = monthData.reduce((s, b) => {
    const gross = Number(b.total_price ?? 0);
    const net = b.net_amount !== null && b.net_amount !== undefined 
      ? Number(b.net_amount) 
      : gross * 0.9;
    return s + net;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold">รายได้</h1>
        <p className="mt-2 text-muted-foreground">รายได้จากเซสชันที่เสร็จสิ้นหลังหักค่าคอมมิชชัน 10%</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
            รายได้สุทธิทั้งหมด <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 font-display text-4xl font-bold">{formatTHB(totalNet)}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            ยอดรวม: {formatTHB(totalGross)} | ค่าธรรมเนียม: {formatTHB(totalCommission)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
            รายได้สุทธิเดือนนี้ <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 font-display text-4xl font-bold text-primary">{formatTHB(monthNet)}</div>
        </div>
      </div>
      
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold mb-4">ประวัติรายการ</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left font-medium text-muted-foreground">
                <th className="pb-3">วันที่</th>
                <th className="pb-3 text-right">ยอดรวม</th>
                <th className="pb-3 text-right">ค่าธรรมเนียม (10%)</th>
                <th className="pb-3 text-right">สุทธิ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">ยังไม่มีการจองที่เสร็จสิ้น</td>
                </tr>
              ) : (
                (data ?? []).map((b, i) => {
                  const gross = Number(b.total_price ?? 0);
                  const commission = b.commission_amount !== null && b.commission_amount !== undefined 
                    ? Number(b.commission_amount) 
                    : gross * 0.1;
                  const net = b.net_amount !== null && b.net_amount !== undefined 
                    ? Number(b.net_amount) 
                    : gross * 0.9;
                  
                  return (
                    <tr key={i}>
                      <td className="py-3">{new Date(b.created_at).toLocaleDateString()}</td>
                      <td className="py-3 text-right">{formatTHB(gross)}</td>
                      <td className="py-3 text-right text-destructive">-{formatTHB(commission)}</td>
                      <td className="py-3 text-right font-semibold text-primary">{formatTHB(net)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
