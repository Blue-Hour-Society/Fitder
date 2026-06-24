import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { bookingStatusTh } from "@/lib/thai-labels";

export const Route = createFileRoute("/trainer/bookings")({
  component: () => <RoleGuard role="trainer"><B /></RoleGuard>,
});

const statusStyles: Record<string, string> = {
  pending: "bg-warning/20 text-warning",
  accepted: "bg-success/20 text-success",
  completed: "bg-primary/20 text-primary",
  rejected: "bg-destructive/20 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

function B() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["trainer-bookings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, slot:availability_slots(date, start_time, end_time)")
        .eq("trainer_id", user!.id)
        .order("created_at", { ascending: false });
      if (!data) return [];
      const ids = [...new Set(data.map((b) => b.client_id))];
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const m = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
      return data.map((b) => ({ ...b, client_name: m.get(b.client_id) ?? "ลูกค้า" }));
    },
    enabled: !!user,
  });

  const setStatus = async (id: string, status: "accepted" | "rejected" | "completed", slotId?: string) => {
    const { error } = await supabase.from("bookings").update({ booking_status: status }).eq("id", id);
    if (error) return toast.error(error.message);
    if (status === "rejected" && slotId) {
      await supabase.from("availability_slots").update({ is_booked: false }).eq("id", slotId);
    }
    toast.success(`อัปเดตการจองเป็น ${bookingStatusTh(status)} แล้ว`);
    qc.invalidateQueries({ queryKey: ["trainer-bookings"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold">การจอง</h1>
        <p className="mt-2 text-muted-foreground">อนุมัติ ปฏิเสธ หรือปิดงานเซสชัน</p>
      </div>
      {isLoading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !data || data.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">ยังไม่มีการจอง</div>
      ) : (
        <div className="space-y-3">
          {data.map((b) => (
            <div key={b.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-display text-lg font-semibold">{b.client_name}</div>
                {b.slot && (
                  <div className="text-sm text-muted-foreground">
                    {new Date(b.slot.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {b.slot.start_time.slice(0, 5)} – {b.slot.end_time.slice(0, 5)}
                  </div>
                )}
                <span className={cn("mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold", statusStyles[b.booking_status])}>{bookingStatusTh(b.booking_status)}</span>
              </div>
              <div className="flex gap-2">
                {b.booking_status === "pending" && (
                  <>
                    <button onClick={() => setStatus(b.id, "accepted")} className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Check className="h-4 w-4" /> อนุมัติ</button>
                    <button onClick={() => setStatus(b.id, "rejected", b.slot_id)} className="flex items-center gap-1 rounded-md border border-border px-4 py-2 text-sm hover:border-destructive hover:text-destructive"><X className="h-4 w-4" /> ปฏิเสธ</button>
                  </>
                )}
                {b.booking_status === "accepted" && (
                  <button onClick={() => setStatus(b.id, "completed")} className="flex items-center gap-1 rounded-md bg-success/20 px-4 py-2 text-sm font-semibold text-success"><CheckCircle2 className="h-4 w-4" /> ทำเครื่องหมายว่าเสร็จสิ้น</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
