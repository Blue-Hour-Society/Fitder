import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Loader2, Save, MapPin } from "lucide-react";
import { toast } from "sonner";
import { AvatarUpload } from "@/components/auth/AvatarUpload";

export const Route = createFileRoute("/client/profile")({
  component: () => (
    <RoleGuard role="client">
      <Profile />
    </RoleGuard>
  ),
});

const GOALS = [
  { v: "weight_loss", l: "Weight Loss" },
  { v: "muscle_gain", l: "Muscle Gain" },
  { v: "body_recomposition", l: "Body Recomposition" },
  { v: "strength_training", l: "Strength Training" },
  { v: "general_fitness", l: "General Fitness" },
];

function Profile() {
  const { user } = useAuth();
  const { data: profile, refetch, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const [form, setForm] = useState<Record<string, unknown>>({});
  useEffect(() => {
    if (profile) setForm(profile as Record<string, unknown>);
  }, [profile]);

  const update = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: (form.full_name as string) || null,
        avatar_url: (form.avatar_url as string) || null,
        gender: (form.gender as "male" | "female" | "other") || null,
        fitness_goal: (form.fitness_goal as "weight_loss") || null,
        budget_min: form.budget_min ? Number(form.budget_min) : null,
        budget_max: form.budget_max ? Number(form.budget_max) : null,
        preferred_trainer_gender: (form.preferred_trainer_gender as "male" | "female" | "other") || null,
        preferred_experience: (form.preferred_experience as "any") || "any",
        experience_level: (form.experience_level as string) || "beginner",
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        health_conditions: (form.health_conditions as string) || null,
        training_modality: (form.training_modality as string) || "gym",
        sessions_per_week: form.sessions_per_week ? Number(form.sessions_per_week) : 3,
        preferred_style: (form.preferred_style as string) || null,
      })
      .eq("id", user!.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile saved");
      refetch();
    }
  };

  const useLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update("latitude", pos.coords.latitude);
        update("longitude", pos.coords.longitude);
        toast.success("Location captured");
      },
      () => toast.error("Could not get location"),
    );
  };

  if (isLoading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold">Profile & preferences</h1>
        <p className="mt-2 text-muted-foreground">Better preferences = better matches.</p>
      </div>

      <div className="flex justify-center rounded-xl border border-border bg-card p-6">
        <AvatarUpload
          userId={user!.id}
          url={(form.avatar_url as string) || null}
          onUpload={(url) => update("avatar_url", url)}
        />
      </div>

      <form onSubmit={save} className="space-y-6 rounded-xl border border-border bg-card p-6">
        <Field label="Full name">
          <input value={(form.full_name as string) ?? ""} onChange={(e) => update("full_name", e.target.value)} className={inputCls} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Gender">
            <select value={(form.gender as string) ?? ""} onChange={(e) => update("gender", e.target.value)} className={inputCls}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Fitness goal">
            <select value={(form.fitness_goal as string) ?? ""} onChange={(e) => update("fitness_goal", e.target.value)} className={inputCls}>
              <option value="">Select</option>
              {GOALS.map((g) => <option key={g.v} value={g.v}>{g.l}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Min budget per session (THB)">
            <input type="number" value={(form.budget_min as number) ?? ""} onChange={(e) => update("budget_min", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Max budget per session (THB)">
            <input type="number" value={(form.budget_max as number) ?? ""} onChange={(e) => update("budget_max", e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preferred trainer gender">
            <select value={(form.preferred_trainer_gender as string) ?? ""} onChange={(e) => update("preferred_trainer_gender", e.target.value)} className={inputCls}>
              <option value="">No preference</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Preferred experience">
            <select value={(form.preferred_experience as string) ?? "any"} onChange={(e) => update("preferred_experience", e.target.value)} className={inputCls}>
              <option value="any">Any</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your experience level">
            <select value={(form.experience_level as string) ?? "beginner"} onChange={(e) => update("experience_level", e.target.value)} className={inputCls}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>
          <Field label="Training Modality">
            <select value={(form.training_modality as string) ?? "gym"} onChange={(e) => update("training_modality", e.target.value)} className={inputCls}>
              <option value="gym">Gym</option>
              <option value="home">Home</option>
              <option value="online">Online</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sessions per Week">
            <input type="number" min="1" max="7" value={(form.sessions_per_week as number) ?? 3} onChange={(e) => update("sessions_per_week", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Preferred Training Style">
            <select value={(form.preferred_style as string) ?? ""} onChange={(e) => update("preferred_style", e.target.value)} className={inputCls}>
              <option value="">No preference</option>
              <option value="strict">Strict</option>
              <option value="supportive">Supportive</option>
              <option value="analytical">Analytical</option>
              <option value="flexible">Flexible</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-4">
          <Field label="Health Conditions">
            <input placeholder="Any injuries or medical notes?" value={(form.health_conditions as string) ?? ""} onChange={(e) => update("health_conditions", e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Location">
          <div className="flex flex-wrap gap-2">
            <input placeholder="Latitude" value={(form.latitude as number) ?? ""} onChange={(e) => update("latitude", e.target.value)} className={`${inputCls} flex-1`} />
            <input placeholder="Longitude" value={(form.longitude as number) ?? ""} onChange={(e) => update("longitude", e.target.value)} className={`${inputCls} flex-1`} />
            <button type="button" onClick={useLocation} className="rounded-md border border-border px-4 py-2 text-sm hover:border-primary">
              Use my location
            </button>
          </div>
        </Field>
        <button disabled={saving} className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-display font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </button>
      </form>
    </div>
  );
}

const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
