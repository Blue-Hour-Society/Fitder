import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, MapPin, Wallet, Award, Loader2, Calendar, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatTHB } from "@/lib/currency";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/client/trainer/$id")({
  component: () => (
    <RoleGuard role="client">
      <TrainerDetail />
    </RoleGuard>
  ),
});

function TrainerDetail() {
  const { id } = useParams({ from: "/client/trainer/$id" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [booking, setBooking] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const { data: trainer, isLoading } = useQuery({
    queryKey: ["trainer-detail", id],
    queryFn: async () => {
      const { data: tp } = await supabase.from("trainer_profiles").select("*").eq("user_id", id).maybeSingle();
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      return { tp, prof };
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["trainer-reviews", id],
    queryFn: async () => {
      // Fetch reviews and profiles separately if join is problematic
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("*")
        .eq("trainer_id", id)
        .order("created_at", { ascending: false });
      
      if (reviewsError) throw reviewsError;
      if (!reviewsData || reviewsData.length === 0) return [];

      const clientIds = reviewsData.map(r => r.client_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", clientIds);

      const profileMap = new Map((profilesData ?? []).map(p => [p.id, p]));

      return reviewsData.map(r => ({
        ...r,
        client: profileMap.get(r.client_id)
      }));
    },
  });

  const { data: canReview } = useQuery({
    queryKey: ["can-review", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      // Relaxed check for testing: any booking status can review
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("client_id", user.id)
        .eq("trainer_id", id);
      return (count ?? 0) > 0;
    },
    enabled: !!user,
  });

  const { data: slots } = useQuery({
    queryKey: ["slots", id],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("trainer_id", id)
        .eq("is_booked", false)
        .gte("date", today)
        .order("date")
        .order("start_time");
      return data ?? [];
    },
  });

  const book = async (slotId: string) => {
    if (!user || !trainer?.tp) return;
    setBooking(slotId);

    const isAutoAccept = (trainer.tp as any).auto_accept === true;
    const totalPrice = trainer.tp.price_per_session ?? 0;
    const commissionRate = 0.1; // 10%
    const commissionAmount = totalPrice * commissionRate;
    const netAmount = totalPrice - commissionAmount;
    const bookingStatus: "accepted" | "pending" = isAutoAccept ? "accepted" : "pending";
    const bookingPayload = {
      client_id: user.id,
      trainer_id: id,
      slot_id: slotId,
      total_price: totalPrice,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      net_amount: netAmount,
      booking_status: bookingStatus,
    };

    const { error } = await supabase.from("bookings").insert(bookingPayload);
    if (error) {
      if (error.code === "23505") {
        const { data: revived, error: reviveError } = await supabase
          .from("bookings")
          .update({
            booking_status: bookingStatus,
            total_price: totalPrice,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
            net_amount: netAmount,
          })
          .eq("client_id", user.id)
          .eq("trainer_id", id)
          .eq("slot_id", slotId)
          .in("booking_status", ["cancelled", "rejected"])
          .select("id")
          .maybeSingle();

        if (!reviveError && revived) {
          await supabase.from("availability_slots").update({ is_booked: true }).eq("id", slotId);
          toast.success(isAutoAccept ? "Booking confirmed automatically!" : "Booking requested!");
          qc.invalidateQueries({ queryKey: ["slots", id] });
          setBooking(null);
          nav({ to: "/client/bookings" });
          return;
        }
      }
      if (error.code === "23505" && error.message.includes("bookings_slot_id_key")) {
        toast.error("This cancelled slot is still locked by the database. Please apply the rebooking migration.");
        setBooking(null);
        return;
      }
      toast.error(error.message);
      setBooking(null);
      return;
    }
    await supabase.from("availability_slots").update({ is_booked: true }).eq("id", slotId);
    toast.success(isAutoAccept ? "Booking confirmed automatically!" : "Booking requested!");
    qc.invalidateQueries({ queryKey: ["slots", id] });
    setBooking(null);
    nav({ to: "/client/bookings" });
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !comment.trim()) return;

    setIsSubmittingReview(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        client_id: user.id,
        trainer_id: id,
        rating,
        comment,
      });

      if (error) throw error;

      toast.success("Review submitted!");
      setComment("");
      qc.invalidateQueries({ queryKey: ["trainer-reviews", id] });
      qc.invalidateQueries({ queryKey: ["trainer-detail", id] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading || !trainer)
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const { tp, prof } = trainer;
  if (!tp) return <div>Trainer not found.</div>;

  const getAvatarUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  const fullAvatarUrl = getAvatarUrl(prof?.avatar_url ?? null);

  // Cold Start Detection
  const createdAt = new Date(tp.created_at);
  const now = new Date();
  const daysSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
  const isColdStart = daysSinceCreated <= 30;
  const displayRating = (tp.rating === 0 && isColdStart) ? 3.5 : (tp.rating ?? 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="aspect-square overflow-hidden rounded-xl border border-border bg-surface-elevated">
          {fullAvatarUrl ? (
            <img src={fullAvatarUrl} alt={prof?.full_name ?? ""} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center font-display text-7xl font-bold text-primary/40">
              {prof?.full_name?.[0]?.toUpperCase() ?? "T"}
            </div>
          )}
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold">{prof?.full_name ?? "Trainer"}</h1>
          {tp.gym_name && (
            <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {tp.gym_name}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-4">
            <Stat icon={Star} label="Rating" value={`${Number(displayRating).toFixed(1)} / 5`} />
            <Stat icon={Award} label="Experience" value={`${tp.experience_years ?? 0} yrs`} />
            <Stat icon={Wallet} label="Price" value={formatTHB(tp.price_per_session)} />
          </div>
          <p className="mt-6 text-muted-foreground">{tp.bio || "No bio yet."}</p>
          {tp.specialties && tp.specialties.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tp.specialties.map((s: string) => (
                <span key={s} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold">
          <Calendar className="h-5 w-5 text-primary" /> Available slots
        </h2>
        {!slots || slots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No available slots right now.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {slots.map((s) => (
              <AlertDialog key={s.id}>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={booking === s.id}
                    className="group rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary disabled:opacity-50"
                  >
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">
                      {new Date(s.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </div>
                    <div className="mt-1 font-display text-xl font-bold">
                      {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                    </div>
                    <div className="mt-2 text-xs text-primary opacity-0 transition group-hover:opacity-100">
                      {booking === s.id ? "Booking…" : "Book this slot →"}
                    </div>
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Booking</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to book this slot with {prof?.full_name} on {new Date(s.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} at {s.start_time.slice(0, 5)}?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => book(s.id)}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold">
            <MessageSquare className="h-5 w-5 text-primary" /> Client reviews
          </h2>
          {!reviews || reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No reviews yet.
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r: any) => {
                const clientAvatar = getAvatarUrl(r.client?.avatar_url);
                return (
                  <div key={r.id} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
                        {clientAvatar ? (
                          <img src={clientAvatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-bold text-primary/40">
                            {r.client?.full_name?.[0]?.toUpperCase() ?? "U"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{r.client?.full_name || "Client"}</div>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={cn("h-3 w-3", i < r.rating ? "fill-primary text-primary" : "text-muted")} />
                            ))}
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground italic">"{r.comment}"</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {canReview && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 font-display text-xl font-bold">Write a review</h2>
            <form onSubmit={submitReview} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Your Rating</label>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1 transition hover:scale-110"
                    >
                      <Star className={cn("h-6 w-6", s <= rating ? "fill-primary text-primary" : "text-muted")} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Your Comment</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell others about your experience..."
                  className="mt-2 min-h-[100px] bg-background"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmittingReview}>
                {isSubmittingReview ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Submit Review
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 font-display text-lg font-bold">{value}</div>
    </div>
  );
}
