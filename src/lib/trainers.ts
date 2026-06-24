import { supabase } from "@/integrations/supabase/client";
import { scoreTrainer, type ClientPrefs, type MatchResult } from "@/lib/matching";
import type { TrainerCardData } from "@/components/trainers/TrainerCard";

export interface RankedTrainer extends TrainerCardData {
  match: MatchResult;
}

export async function fetchRankedTrainers(prefs: ClientPrefs): Promise<RankedTrainer[]> {
  const { data: trainers, error } = await supabase
    .from("trainer_profiles")
    .select("user_id, bio, specialties, specialized_goals, experience_years, price_per_session, rating, rating_count, gym_name, training_location, is_approved, is_suspended, certifications, created_at, training_style, target_client_level, training_modality, response_rate, retention_rate")
    .eq("is_approved", true)
    .eq("is_suspended", false);
  if (error) throw error;
  if (!trainers || trainers.length === 0) return [];

  const ids = trainers.map((t) => t.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, gender, latitude, longitude")
    .in("id", ids);

  // Fetch availability slots count for each trainer
  const { data: slots } = await supabase
    .from("availability_slots")
    .select("trainer_id, id")
    .in("trainer_id", ids)
    .eq("is_booked", false);

  const slotMap = new Map<string, number>();
  slots?.forEach(s => {
    slotMap.set(s.trainer_id, (slotMap.get(s.trainer_id) ?? 0) + 1);
  });

  const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return trainers
    .map((t) => {
      const p = profMap.get(t.user_id);
      
      // Calculate profile completeness
      const fields = [t.bio, t.specialties, t.experience_years, t.price_per_session, t.gym_name, t.training_location, t.certifications, p?.full_name, p?.avatar_url];
      const filled = fields.filter(f => f !== null && f !== undefined && f !== "").length;
      const completeness = filled / fields.length;

      const match = scoreTrainer(prefs, {
        user_id: t.user_id,
        created_at: t.created_at,
        specialties: t.specialties,
        specialized_goals: t.specialized_goals,
        experience_years: t.experience_years,
        price_per_session: Number(t.price_per_session ?? 0),
        rating: Number(t.rating ?? 0),
        training_location: t.training_location,
        availability_slots: Array(slotMap.get(t.user_id) ?? 0).fill({}),
        profile_completeness: completeness,
        retention_rate: Number(t.retention_rate ?? 0.8),
        response_rate: Number(t.response_rate ?? 0.9),
        training_style: t.training_style,
        target_client_level: t.target_client_level,
        training_modality: t.training_modality,
        profile: {
          gender: p?.gender ?? null,
          latitude: p?.latitude ?? null,
          longitude: p?.longitude ?? null,
        },
      });

      if (!match) return null;

      return {
        user_id: t.user_id,
        full_name: p?.full_name ?? null,
        avatar_url: p?.avatar_url ?? null,
        bio: t.bio,
        specialties: t.specialties,
        experience_years: t.experience_years,
        price_per_session: Number(t.price_per_session ?? 0),
        rating: Number(t.rating ?? 0),
        gym_name: t.gym_name,
        rating_count: Number(t.rating_count ?? 0),
        match,
      } as RankedTrainer;
    })
    .filter((t): t is RankedTrainer => t !== null)
    .sort((a, b) => b.match.score - a.match.score);
}
