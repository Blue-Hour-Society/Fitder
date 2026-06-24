import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/reviews")({
  component: R,
});

function R() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data: reviews } = await supabase
        .from("reviews")
        .select(`
          *,
          client:profiles!client_id(full_name, email),
          trainer:profiles!trainer_id(full_name, email)
        `)
        .order("created_at", { ascending: false });
      return reviews ?? [];
    },
  });

  const deleteReview = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Review deleted");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-bold">Review management</h1>
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4">
          {(data ?? []).map((r: any) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < r.rating ? "fill-primary text-primary" : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm italic text-muted-foreground">"{r.comment}"</p>
                  <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                    <div>
                      <span className="font-semibold text-foreground">Client:</span>{" "}
                      {r.client?.full_name}
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Trainer:</span>{" "}
                      {r.trainer?.full_name}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => deleteReview(r.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {data?.length === 0 && (
            <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
              No reviews found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
