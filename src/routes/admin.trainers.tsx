import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/trainers")({
  component: T,
});

function T() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-trainers"],
    queryFn: async () => {
      const { data: tps } = await supabase.from("trainer_profiles").select("*").order("created_at", { ascending: false });
      const ids = (tps ?? []).map((t) => t.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      const m = new Map((profs ?? []).map((p) => [p.id, p]));
      return (tps ?? []).map((t) => ({ ...t, profile: m.get(t.user_id) }));
    },
  });

  const toggle = async (id: string, field: "is_approved" | "is_suspended", v: boolean) => {
    const patch = field === "is_approved" ? { is_approved: v } : { is_suspended: v };
    const { error } = await supabase.from("trainer_profiles").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-trainers"] }); }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-bold">Trainer approval</h1>
      {isLoading ? <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        : <div className="space-y-3">
          {(data ?? []).map((t) => (
            <div key={t.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-display text-lg font-semibold">{t.profile?.full_name}</div>
                <div className="text-sm text-muted-foreground">{t.profile?.email}</div>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-bold uppercase ${t.is_approved ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>{t.is_approved ? "Approved" : "Pending"}</span>
                  {t.is_suspended && <span className="rounded-full bg-destructive/20 px-2 py-0.5 font-bold uppercase text-destructive">Suspended</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggle(t.id, "is_approved", !t.is_approved)} className="rounded-md border border-border px-4 py-2 text-sm hover:border-primary">{t.is_approved ? "Unapprove" : "Approve"}</button>
                <button onClick={() => toggle(t.id, "is_suspended", !t.is_suspended)} className="rounded-md border border-border px-4 py-2 text-sm hover:border-destructive hover:text-destructive">{t.is_suspended ? "Unsuspend" : "Suspend"}</button>
              </div>
            </div>
          ))}
        </div>}
    </div>
  );
}
