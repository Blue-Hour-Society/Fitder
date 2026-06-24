import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatTHB } from "@/lib/currency";
import { bookingStatusTh } from "@/lib/thai-labels";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/client/bookings")({
  component: () => (
    <RoleGuard role="client">
      <Bookings />
    </RoleGuard>
  ),
});

const statusStyles: Record<string, string> = {
  pending: "bg-warning/20 text-warning",
  accepted: "bg-success/20 text-success",
  completed: "bg-primary/20 text-primary",
  rejected: "bg-destructive/20 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

function Bookings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, slot:availability_slots(date, start_time, end_time)")
        .eq("client_id", user!.id)
        .order("created_at", { ascending: false });
      if (!data) return [];
      const trainerIds = [...new Set(data.map((b) => b.trainer_id))];
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", trainerIds);
      const m = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
      return data.map((b) => ({ ...b, trainer_name: m.get(b.trainer_id) ?? "เทรนเนอร์" }));
    },
    enabled: !!user,
  });

  const cancel = async (id: string, slotId: string) => {
    const { error } = await supabase.from("bookings").update({ booking_status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("availability_slots").update({ is_booked: false }).eq("id", slotId);
    toast.success("ยกเลิกการจองแล้ว");
    qc.invalidateQueries({ queryKey: ["my-bookings"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold">การจองของฉัน</h1>
        <p className="mt-2 text-muted-foreground">ติดตามคำขอ เซสชัน และประวัติการจอง</p>
      </div>
      {isLoading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !bookings || bookings.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          No bookings yet — discover a trainer to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-display text-lg font-semibold">{b.trainer_name}</div>
                {b.slot && (
                  <div className="text-sm text-muted-foreground">
                    {new Date(b.slot.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} ·{" "}
                    {b.slot.start_time.slice(0, 5)} – {b.slot.end_time.slice(0, 5)}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold uppercase", statusStyles[b.booking_status])}>
                    {bookingStatusTh(b.booking_status)}
                  </span>
                  <span className="text-sm text-muted-foreground">{formatTHB(b.total_price)}</span>
                </div>
              </div>
              {(b.booking_status === "pending" || b.booking_status === "accepted") && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                    className="rounded-md border border-border px-4 py-2 text-sm hover:border-destructive hover:text-destructive"
                  >
                    ยกเลิก
                  </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>ยืนยันการยกเลิก</AlertDialogTitle>
                      <AlertDialogDescription>
                        คุณต้องการยกเลิกการจองกับ {b.trainer_name} วันที่ {new Date(b.slot.date).toLocaleDateString("th-TH", { weekday: "long", month: "long", day: "numeric" })} เวลา {b.slot.start_time.slice(0, 5)} ใช่ไหม
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>กลับ</AlertDialogCancel>
                      <AlertDialogAction onClick={() => cancel(b.id, b.slot_id)}>ยืนยันการยกเลิก</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
