import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, startOfWeek, addDays, startOfDay, isSameDay, isBefore, addHours } from "date-fns";

export const Route = createFileRoute("/trainer/availability")({
  component: () => <RoleGuard role="trainer"><Avail /></RoleGuard>,
});

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 to 21:00

function Avail() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const { data: slotsData, isLoading } = useQuery({
    queryKey: ["my-slots", user?.id],
    queryFn: async () => {
      const [slotsRes, bookingsRes] = await Promise.all([
        supabase.from("availability_slots").select("*").eq("trainer_id", user!.id),
        supabase.from("bookings").select("slot_id, booking_status").eq("trainer_id", user!.id).in("booking_status", ["pending", "accepted"])
      ]);
      
      const slots = slotsRes.data ?? [];
      const bookings = bookingsRes.data ?? [];
      
      // Map bookings to slots so we have accurate is_booked status
      return slots.map(slot => ({
        ...slot,
        is_booked: slot.is_booked || bookings.some(b => b.slot_id === slot.id)
      }));
    },
    enabled: !!user,
  });

  const slots = slotsData;

  const [toggling, setToggling] = useState<string | null>(null);

  const toggleSlot = async (day: Date, hour: number) => {
    if (!user) return;
    
    const dateStr = format(day, "yyyy-MM-dd");
    const startTime = `${hour.toString().padStart(2, "0")}:00:00`;
    const endTime = `${(hour + 1).toString().padStart(2, "0")}:00:00`;
    
    const existing = slots?.find(s => s.date === dateStr && s.start_time === startTime);
    const key = `${dateStr}-${startTime}`;
    
    if (existing?.is_booked) {
      toast.error("ไม่สามารถลบช่วงเวลาที่ถูกจองแล้วได้");
      return;
    }

    setToggling(key);
    
    if (existing) {
      const { error } = await supabase.from("availability_slots").delete().eq("id", existing.id);
      if (error) toast.error(error.message);
      else {
        toast.success("ลบช่วงเวลาแล้ว");
        qc.invalidateQueries({ queryKey: ["my-slots"] });
      }
    } else {
      const { error } = await supabase.from("availability_slots").insert({
        trainer_id: user.id,
        date: dateStr,
        day_of_week: day.getDay(),
        start_time: startTime,
        end_time: endTime,
      });
      if (error) toast.error(error.message);
      else {
        toast.success("เพิ่มช่วงเวลาแล้ว");
        qc.invalidateQueries({ queryKey: ["my-slots"] });
      }
    }
    setToggling(null);
  };

  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const prevWeek = () => setCurrentDate(addDays(currentDate, -7));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">ตารางเวลา</h1>
          <p className="mt-1 text-muted-foreground">จัดการเวลาว่างให้ลูกค้าจองได้</p>
        </div>
        
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-1 shadow-sm">
          <button onClick={prevWeek} className="rounded-lg p-2 transition hover:bg-muted"><ChevronLeft className="h-5 w-5" /></button>
          <div className="flex items-center gap-2 px-3 font-display font-bold">
            <CalendarIcon className="h-4 w-4 text-primary" />
            {format(weekStart, "MMM d")} – {format(weekDays[6], "MMM d, yyyy")}
          </div>
          <button onClick={nextWeek} className="rounded-lg p-2 transition hover:bg-muted"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/30">
                <th className="sticky left-0 z-10 w-20 border-b border-border bg-card/80 p-4 text-center backdrop-blur-sm">
                  <Clock className="mx-auto h-4 w-4 text-muted-foreground" />
                </th>
                {weekDays.map((day) => (
                  <th key={day.toString()} className="min-w-[120px] border-b border-border p-4 text-center">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{format(day, "EEE")}</div>
                    <div className={cn(
                      "mt-1 font-display text-2xl font-bold",
                      isSameDay(day, new Date()) && "text-primary"
                    )}>{format(day, "d")}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour} className="group transition-colors hover:bg-muted/10">
                  <td className="sticky left-0 z-10 border-b border-border bg-card/80 p-3 text-center text-xs font-bold text-muted-foreground backdrop-blur-sm">
                    {hour}:00
                  </td>
                  {weekDays.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const startTime = `${hour.toString().padStart(2, "0")}:00:00`;
                    const slot = slots?.find(s => s.date === dateStr && s.start_time === startTime);
                    const isPast = isBefore(addHours(startOfDay(day), hour), new Date());
                    const key = `${dateStr}-${startTime}`;
                    const isLoading = toggling === key;

                    return (
                      <td key={key} className="border-b border-border p-1">
                        <button
                          disabled={isPast && !slot}
                          onClick={() => toggleSlot(day, hour)}
                          className={cn(
                            "relative flex h-14 w-full flex-col items-center justify-center rounded-lg border-2 transition-all",
                            !slot && "border-transparent hover:border-primary/20 hover:bg-primary/5",
                            slot && !slot.is_booked && "border-primary/20 bg-primary/10 text-primary hover:bg-primary/20",
                            slot?.is_booked && "cursor-not-allowed border-purple-500/20 bg-purple-500/10 text-purple-500",
                            isPast && !slot && "cursor-not-allowed opacity-30"
                          )}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : slot?.is_booked ? (
                            <>
                              <Check className="h-4 w-4" />
                              <span className="mt-1 text-[10px] font-bold uppercase tracking-tighter">ถูกจอง</span>
                            </>
                          ) : slot ? (
                            <>
                              <div className="h-2 w-2 rounded-full bg-primary" />
                              <span className="mt-1 text-[10px] font-bold uppercase tracking-tighter">ว่าง</span>
                            </>
                          ) : !isPast && (
                            <div className="h-1.5 w-1.5 rounded-full bg-border transition-colors group-hover:bg-primary/30" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-6 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full border border-primary/30 bg-primary/10" />
          <span className="text-muted-foreground font-medium">เปิดให้จอง</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full border border-purple-500/30 bg-purple-500/10" />
          <span className="text-muted-foreground font-medium">ลูกค้าจองแล้ว</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-border" />
          <span className="text-muted-foreground font-medium">ไม่ว่าง</span>
        </div>
      </div>
    </div>
  );
}
