import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatTHB } from "@/lib/currency";

export const Route = createFileRoute("/admin/analytics")({
  component: An,
});

function An() {
  const { data } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const { data: b } = await supabase.from("bookings").select("booking_status, total_price, commission_amount, created_at");
      
      const counts: Record<string, number> = {};
      let totalRevenue = 0;
      let totalCommission = 0;
      
      const monthlyRevenue: Record<string, { month: string, revenue: number, commission: number }> = {};

      (b ?? []).forEach((x) => { 
        counts[x.booking_status] = (counts[x.booking_status] ?? 0) + 1;
        
        if (x.booking_status === "completed") {
          const gross = Number(x.total_price ?? 0);
          const commission = x.commission_amount !== null && x.commission_amount !== undefined 
            ? Number(x.commission_amount) 
            : gross * 0.1;

          totalRevenue += gross;
          totalCommission += commission;
          
          const date = new Date(x.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyRevenue[monthKey]) {
            monthlyRevenue[monthKey] = { month: monthKey, revenue: 0, commission: 0 };
          }
          monthlyRevenue[monthKey].revenue += gross;
          monthlyRevenue[monthKey].commission += commission;
        }
      });

      return {
        statusCounts: Object.entries(counts).map(([status, count]) => ({ status, count })),
        revenueData: Object.values(monthlyRevenue).sort((a, b) => a.month.localeCompare(b.month)),
        totals: { revenue: totalRevenue, commission: totalCommission }
      };
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-bold">Analytics</h1>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Total Platform Revenue</div>
          <div className="mt-2 text-3xl font-bold">{formatTHB(data?.totals.revenue)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Total Commission (10%)</div>
          <div className="mt-2 text-3xl font-bold text-primary">{formatTHB(data?.totals.commission)}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Bookings by status</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data?.statusCounts ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0 0)" />
                <XAxis dataKey="status" stroke="oklch(0.7 0 0)" />
                <YAxis stroke="oklch(0.7 0 0)" />
                <Tooltip contentStyle={{ background: "oklch(0.2 0 0)", border: "1px solid oklch(0.3 0 0)" }} />
                <Bar dataKey="count" fill="oklch(0.92 0.22 119)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Platform Commission (Monthly)</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data?.revenueData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0 0)" />
                <XAxis dataKey="month" stroke="oklch(0.7 0 0)" />
                <YAxis stroke="oklch(0.7 0 0)" />
                <Tooltip contentStyle={{ background: "oklch(0.2 0 0)", border: "1px solid oklch(0.3 0 0)" }} />
                <Bar dataKey="commission" fill="oklch(0.6 0.18 259)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
