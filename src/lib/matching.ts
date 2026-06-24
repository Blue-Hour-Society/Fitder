// Trainer compatibility scoring (0-100)

export interface ClientPrefs {
  fitness_goal?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  preferred_trainer_gender?: string | null;
  preferred_experience?: string | null;
  experience_level?: string | null; // User's own level
  latitude?: number | null;
  longitude?: number | null;
  training_style_pref?: string | null;
  sessions_per_week_pref?: number | null;
  training_modality_pref?: string | null; // gym, home, online
}

export interface TrainerLike {
  user_id: string;
  created_at: string; // For Cold Start check
  specialties?: string[] | null;
  specialized_goals?: string[] | null;
  experience_years?: number | null;
  price_per_session?: number | null;
  rating?: number | null;
  training_location?: string | null;
  availability_slots?: { start_time: string; end_time: string; date: string }[] | null;
  retention_rate?: number | null;
  response_rate?: number | null;
  training_style?: string | null;
  profile_completeness?: number | null;
  target_client_level?: string[] | null;
  training_modality?: string[] | null;
  profile: {
    gender?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
}

export interface MatchBreakdown {
  label: string;
  score: number;
  maxScore: number;
  isMatch: boolean;
  text: string;
}

export interface MatchResult {
  score: number;
  distanceKm: number | null;
  reasons: string[];
  badges: string[];
  breakdown: MatchBreakdown[];
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Goal to Specialty Matrix (Weights)
const goalSpecialtyMatrix: Record<string, Record<string, number>> = {
  weight_loss: {
    "hiit": 1.0,
    "cardio": 0.9,
    "fat loss": 1.0,
    "weight loss": 1.0,
    "nutrition": 0.7,
    "strength": 0.5,
  },
  muscle_gain: {
    "bodybuilding": 1.0,
    "hypertrophy": 1.0,
    "muscle": 1.0,
    "strength": 0.8,
    "nutrition": 0.6,
  },
  body_recomposition: {
    "recomposition": 1.0,
    "strength": 0.9,
    "nutrition": 1.0,
    "fat loss": 0.7,
    "muscle": 0.7,
  },
  strength_training: {
    "strength": 1.0,
    "powerlifting": 1.0,
    "olympic": 1.0,
    "mobility": 0.6,
  },
  general_fitness: {
    "functional": 1.0,
    "general": 1.0,
    "wellness": 0.9,
    "mobility": 0.8,
  },
};

export function scoreTrainer(
  client: ClientPrefs,
  trainer: TrainerLike,
): MatchResult | null {
  const reasons: string[] = [];
  const breakdown: MatchBreakdown[] = [];
  let total = 0;

  const price = trainer.price_per_session ?? 0;
  const isOnline = trainer.training_location?.toLowerCase().includes("online");

  // Cold Start Detection (New trainer for first 30 days)
  const createdAt = new Date(trainer.created_at);
  const now = new Date();
  const daysSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
  const isColdStart = daysSinceCreated <= 30;

  // --- HARD FILTERS ---
  if (client.budget_max != null && price > client.budget_max) return null;

  let distanceKm: number | null = null;
  if (
    client.latitude != null &&
    client.longitude != null &&
    trainer.profile.latitude != null &&
    trainer.profile.longitude != null
  ) {
    distanceKm = haversineKm(
      { lat: client.latitude, lng: client.longitude },
      { lat: trainer.profile.latitude, lng: trainer.profile.longitude },
    );
    if (distanceKm > 50 && !isOnline) return null;
  }

  // --- SCORING (New Weights) ---

  // 1. Goal × Specialty Matrix (25%)
  const goal = client.fitness_goal ?? undefined;
  const specs = (trainer.specialties ?? []).map((s) => s.toLowerCase());
  const specializedGoals = (trainer.specialized_goals ?? []).map(g => g.toLowerCase());
  
  let goalScoreValue = 0.5;
  if (goal) {
    const matrix = goalSpecialtyMatrix[goal] ?? {};
    if (specializedGoals.includes(goal.toLowerCase())) {
      goalScoreValue = 1.0;
      reasons.push(`Expert in ${goal.replace("_", " ")}`);
    } else {
      let bestSpecWeight = 0;
      for (const [spec, weight] of Object.entries(matrix)) {
        if (specs.some(s => s.includes(spec))) {
          bestSpecWeight = Math.max(bestSpecWeight, weight);
        }
      }
      goalScoreValue = bestSpecWeight;
      if (goalScoreValue > 0) reasons.push(`Specialty match for your goal`);
    }
  }
  const goalScoreFinal = goalScoreValue * 25;
  total += goalScoreFinal;
  breakdown.push({
    label: "Goal",
    score: goalScoreFinal,
    maxScore: 25,
    isMatch: goalScoreValue >= 0.7,
    text: goalScoreValue >= 0.7 ? "Goal ตรง ✓" : "Goal partial match",
  });

  // 2. Schedule Overlap Score (20%)
  const sessionsNeeded = client.sessions_per_week_pref ?? 3;
  const availableSlotsCount = trainer.availability_slots?.length ?? 0;
  const overlapRatio = Math.min(1, availableSlotsCount / sessionsNeeded);
  const scheduleScoreFinal = overlapRatio * 20;
  total += scheduleScoreFinal;
  if (overlapRatio >= 0.8) reasons.push("Great schedule availability");
  breakdown.push({
    label: "Schedule",
    score: scheduleScoreFinal,
    maxScore: 20,
    isMatch: overlapRatio >= 0.8,
    text: `ว่างตรงกัน ${availableSlotsCount}/${sessionsNeeded} วัน ✓`,
  });

  // 3. Trainer Quality Score (15%)
  // Quality = rating (60%) + retention/response (30%) + completeness (10%)
  const rating = trainer.rating ?? 0;
  let ratingScore = rating / 5;
  let performanceScore = ((trainer.retention_rate ?? 0.8) + (trainer.response_rate ?? 0.9)) / 2;
  
  // Apply Cold Start quality boost (0.7 default score for 30 days)
  if (isColdStart && rating === 0) {
    ratingScore = 0.7; 
    performanceScore = 0.7;
  }
  
  const completenessScore = trainer.profile_completeness ?? 0.8;
  const qualityScoreValue = (ratingScore * 0.6) + (performanceScore * 0.3) + (completenessScore * 0.1);
  const qualityScoreFinal = qualityScoreValue * 15;
  total += qualityScoreFinal;
  if (qualityScoreValue >= 0.8) reasons.push("High-quality professional");
  breakdown.push({
    label: "Quality",
    score: qualityScoreFinal,
    maxScore: 15,
    isMatch: qualityScoreValue >= 0.7,
    text: isColdStart && rating === 0 ? "New rising star (3.5★)" : `Rated ${rating} stars ✓`,
  });

  // 4. Experience & Level Fit (15%)
  const expYears = trainer.experience_years ?? 0;
  const userLevel = client.experience_level;
  const targetLevels = (trainer.target_client_level ?? []).map(l => l.toLowerCase());
  
  let expScoreValue = 0.5;
  if (userLevel && targetLevels.includes(userLevel.toLowerCase())) {
    expScoreValue = 1.0;
  } else if (userLevel) {
    // Fallback logic based on years
    if (userLevel === "beginner" && expYears >= 2) expScoreValue = 0.8;
    else if (userLevel === "intermediate" && expYears >= 5) expScoreValue = 0.8;
    else if (userLevel === "advanced" && expYears >= 8) expScoreValue = 0.8;
  } else {
    expScoreValue = 0.7;
  }
  const expScoreFinal = expScoreValue * 15;
  total += expScoreFinal;
  breakdown.push({
    label: "Experience",
    score: expScoreFinal,
    maxScore: 15,
    isMatch: expScoreValue >= 0.8,
    text: expScoreValue >= 0.8 ? "Level fit ✓" : "Experience partial fit",
  });

  // 5. Distance / Location & Modality (10%)
  const clientModality = client.training_modality_pref;
  const trainerModalities = (trainer.training_modality ?? []).map(m => m.toLowerCase());
  
  let distScoreValue = 0.5;
  let modalityMatch = false;
  
  if (clientModality && trainerModalities.includes(clientModality.toLowerCase())) {
    modalityMatch = true;
    distScoreValue = 0.8;
  }

  if (distanceKm != null) {
    if (distanceKm <= 5) distScoreValue = Math.max(distScoreValue, 1.0);
    else if (distanceKm <= 15) distScoreValue = Math.max(distScoreValue, 0.8);
    else if (distanceKm <= 30) distScoreValue = Math.max(distScoreValue, 0.5);
    if (distScoreValue >= 0.8) reasons.push(`Close to you (${distanceKm.toFixed(1)} km)`);
  } else if (isOnline || (clientModality === "online" && trainerModalities.includes("online"))) {
    distScoreValue = 1.0;
    reasons.push("Available online");
  }

  const distScoreFinal = distScoreValue * 10;
  total += distScoreFinal;
  breakdown.push({
    label: "Location",
    score: distScoreFinal,
    maxScore: 10,
    isMatch: distScoreValue >= 0.8,
    text: modalityMatch ? "Modality match ✓" : (distanceKm ? `${distanceKm.toFixed(0)}km away` : "Location ok"),
  });

  // 6. Training Style Match (10%)
  const clientStyle = client.training_style_pref;
  const trainerStyle = trainer.training_style;
  let styleScoreValue = 0.5;
  if (clientStyle && trainerStyle && clientStyle.toLowerCase() === trainerStyle.toLowerCase()) {
    styleScoreValue = 1.0;
    reasons.push(`Matches your ${clientStyle} training style`);
  } else if (!clientStyle) {
    styleScoreValue = 0.7;
  }
  const styleScoreFinal = styleScoreValue * 10;
  total += styleScoreFinal;
  breakdown.push({
    label: "Style",
    score: styleScoreFinal,
    maxScore: 10,
    isMatch: styleScoreValue >= 1.0,
    text: styleScoreValue >= 1.0 ? "Style ตรง ✓" : "Standard style",
  });

  // Add Budget breakdown (implied by scoreTrainer not returning null)
  breakdown.push({
    label: "Budget",
    score: 5,
    maxScore: 5,
    isMatch: true,
    text: "Budget fit ✓",
  });
  total += 5;

  const score = Math.min(100, Math.round(total));
  const badges: string[] = [];
  if (score >= 90) badges.push("Perfect Match");
  else if (score >= 80) badges.push("Best Match");
  if (isColdStart) badges.push("New Trainer");
  if (distanceKm != null && distanceKm <= 3) badges.push("Closest");
  if (isOnline) badges.push("Online");
  if (expYears >= 10) badges.push("Veteran Coach");

  return { score, distanceKm, reasons, badges, breakdown };
}
