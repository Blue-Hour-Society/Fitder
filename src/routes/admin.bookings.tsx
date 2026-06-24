import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MoreVertical, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTHB } from "@/lib/currency";

export const Route = createFileRoute("/admin/bookings")({
  component: B,
});

function B() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data: bookings } = await supabase
        .from("bookings")
        .select(`
          *,
          client:profiles!client_id(full_name, email),
          trainer:profiles!trainer_id(full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(100);
      return bookings ?? [];
    },
  });

  const updateStatus = async (bookingId: string, status: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ booking_status: status as any })
      .eq("id", bookingId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Booking status updated to ${status}`);
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-bold">Booking management</h1>
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Trainer</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data ?? []).map((b: any) => (
                  <tr key={b.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <div className="font-semibold">{b.client?.full_name}</div>
                      <div className="text-xs text-muted-foreground">{b.client?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold">{b.trainer?.full_name}</div>
                      <div className="text-xs text-muted-foreground">{b.trainer?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider",
                          b.booking_status === "completed"
                            ? "bg-success/20 text-success"
                            : b.booking_status === "cancelled" || b.booking_status === "rejected"
                              ? "bg-destructive/20 text-destructive"
                              : b.booking_status === "accepted"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-warning/20 text-warning"
                        )}
                      >
                        {b.booking_status === "pending" && <Clock className="h-3 w-3" />}
                        {b.booking_status === "accepted" && <CheckCircle2 className="h-3 w-3" />}
                        {b.booking_status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                        {(b.booking_status === "cancelled" || b.booking_status === "rejected") && (
                          <XCircle className="h-3 w-3" />
                        )}
                        {b.booking_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-primary">{formatTHB(b.total_price)}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => updateStatus(b.id, "accepted")}>
                            Accept Booking
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(b.id, "completed")}>
                            Mark as Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(b.id, "rejected")}>
                            Reject Booking
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onClick={() => updateStatus(b.id, "cancelled")}
                          >
                            Cancel Booking
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
