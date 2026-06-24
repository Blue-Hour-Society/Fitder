import { Link } from "@tanstack/react-router";
import { MapPin, Star, Sparkles, CheckCircle2 } from "lucide-react";
import type { MatchResult } from "@/lib/matching";
import { supabase } from "@/integrations/supabase/client";
import { formatTHB } from "@/lib/currency";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface TrainerCardData {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  specialties: string[] | null;
  experience_years: number | null;
  price_per_session: number | null;
  rating: number | null;
  rating_count: number | null;
  gym_name: string | null;
}

export function TrainerCard({
  trainer,
  match,
}: {
  trainer: TrainerCardData;
  match?: MatchResult;
}) {
  const getAvatarUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  const fullAvatarUrl = getAvatarUrl(trainer.avatar_url);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/50 hover:glow-lime">
      <Link
        to="/client/trainer/$id"
        params={{ id: trainer.user_id }}
        className="flex flex-1 flex-col"
      >
        {match && match.badges.length > 0 && (
          <div className="absolute right-3 top-3 z-10 flex flex-wrap justify-end gap-1">
            {match.badges.map((b) => (
              <span
                key={b}
                className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-lg"
              >
                {b}
              </span>
            ))}
          </div>
        )}
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-elevated">
          {fullAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fullAvatarUrl}
              alt={trainer.full_name ?? "เทรนเนอร์"}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-5xl font-bold text-primary/40">
              {trainer.full_name?.[0]?.toUpperCase() ?? "T"}
            </div>
          )}
          
          {match && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-background/90 px-3 py-1 text-xs font-bold backdrop-blur cursor-help border border-primary/20">
                    <Sparkles className="h-3 w-3 text-primary" />
                    ตรงกัน {match.score}%
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="w-64 p-3 bg-card border-border shadow-xl">
                  <div className="space-y-2">
                    <p className="font-bold text-sm border-b border-border pb-1 mb-2">รายละเอียดความเข้ากัน</p>
                    {match.breakdown.map((item) => (
                      <div key={item.label} className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{item.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={item.isMatch ? "text-primary font-medium" : "text-muted-foreground"}>
                            {item.text}
                          </span>
                          {item.isMatch && <CheckCircle2 className="h-3 w-3 text-primary" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-semibold leading-tight">
              {trainer.full_name ?? "เทรนเนอร์"}
            </h3>
            <div className="flex items-center gap-1.5 text-sm">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              <span className="font-semibold">
                {trainer.rating === 0 && match?.badges.includes("New Trainer") 
                  ? "3.5" 
                  : (trainer.rating && trainer.rating > 0 ? trainer.rating.toFixed(1) : "0.0")}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({trainer.rating_count ?? 0} รีวิว)
              </span>
            </div>
          </div>
          {trainer.gym_name && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {trainer.gym_name}
              {match?.distanceKm != null && (
                <span> · {match.distanceKm.toFixed(1)} km</span>
              )}
            </div>
          )}
          {trainer.specialties && trainer.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {trainer.specialties.slice(0, 3).map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          <div className="mt-auto flex items-end justify-between pt-2">
            <div>
              <div className="text-xs text-muted-foreground">ต่อเซสชัน</div>
              <div className="font-display text-xl font-bold text-primary">
                {formatTHB(trainer.price_per_session)}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              ประสบการณ์ {trainer.experience_years ?? 0} ปี
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
