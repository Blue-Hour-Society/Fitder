import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Loader2, Save, MapPin } from "lucide-react";
import { toast } from "sonner";
import { AvatarUpload } from "@/components/auth/AvatarUpload";
import { Checkbox } from "@/components/ui/checkbox";
import { goalTh, levelTh, modalityTh, styleTh } from "@/lib/thai-labels";

const GOALS = [
  { v: "weight_loss", l: "ลดน้ำหนัก" },
  { v: "muscle_gain", l: "เพิ่มกล้ามเนื้อ" },
  { v: "body_recomposition", l: "ปรับรูปร่าง" },
  { v: "strength_training", l: "เพิ่มความแข็งแรง" },
  { v: "general_fitness", l: "สุขภาพทั่วไป" },
];

export const Route = createFileRoute("/trainer/profile")({
  component: () => <RoleGuard role="trainer"><P /></RoleGuard>,
});

function P() {
  const { user } = useAuth();
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["trainer-profile", user?.id],
    queryFn: async () => {
      const { data: tp } = await supabase.from("trainer_profiles").select("*").eq("user_id", user!.id).maybeSingle();
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return { tp, prof };
    },
    enabled: !!user,
  });

  const [form, setForm] = useState<Record<string, unknown>>({});
  useEffect(() => {
    if (data) setForm({ ...data.prof, ...data.tp, full_name: data.prof?.full_name });
  }, [data]);

  const [saving, setSaving] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const specialties = String(form.specialties_str ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const certifications = String(form.certifications_str ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("profiles").update({
        full_name: (form.full_name as string) || null,
        avatar_url: (form.avatar_url as string) || null,
        gender: (form.gender as "male") || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      }).eq("id", user!.id),
      supabase.from("trainer_profiles").update({
        bio: (form.bio as string) || null,
        specialties,
        certifications,
        specialized_goals: (form.specialized_goals as string[]) || [],
        experience_years: Number(form.experience_years || 0),
        price_per_session: Number(form.price_per_session || 0),
        training_location: (form.training_location as string) || null,
        gym_name: (form.gym_name as string) || null,
        training_style: (form.training_style as string) || "flexible",
        target_client_level: (form.target_client_level as string[]) || [],
        training_modality: (form.training_modality as string[]) || [],
      }).eq("user_id", user!.id),
    ]);
    setSaving(false);
    if (e1 || e2) toast.error((e1 || e2)!.message);
    else { toast.success("บันทึกโปรไฟล์แล้ว"); refetch(); }
  };

  if (isLoading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const specStr = (form.specialties_str as string) ?? (Array.isArray(form.specialties) ? (form.specialties as string[]).join(", ") : "");
  const certStr = (form.certifications_str as string) ?? (Array.isArray(form.certifications) ? (form.certifications as string[]).join(", ") : "");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold">โปรไฟล์เทรนเนอร์</h1>
        <p className="mt-2 text-muted-foreground">ข้อมูลนี้จะแสดงให้ลูกค้าเห็น</p>
      </div>

      <div className="flex justify-center rounded-xl border border-border bg-card p-6">
        <AvatarUpload
          userId={user!.id}
          url={(form.avatar_url as string) || null}
          onUpload={(url) => setForm({ ...form, avatar_url: url })}
        />
      </div>

      <form onSubmit={save} className="space-y-5 rounded-xl border border-border bg-card p-6">
        <F label="ชื่อเต็ม"><input value={(form.full_name as string) ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={cls} /></F>
        <F label="แนะนำตัว"><textarea rows={3} value={(form.bio as string) ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={cls} /></F>
        
        <F label="เป้าหมายที่เชี่ยวชาญ">
          <div className="grid grid-cols-2 gap-3 mt-2">
            {GOALS.map((g) => (
              <div key={g.v} className="flex items-center space-x-2">
                <Checkbox
                  id={g.v}
                  checked={((form.specialized_goals as string[]) ?? []).includes(g.v)}
                  onCheckedChange={(checked) => {
                    const current = (form.specialized_goals as string[]) ?? [];
                    const next = checked ? [...current, g.v] : current.filter((v) => v !== g.v);
                    setForm({ ...form, specialized_goals: next });
                  }}
                />
                <label htmlFor={g.v} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                  {g.l}
                </label>
              </div>
            ))}
          </div>
        </F>

        <div className="grid gap-4 sm:grid-cols-2">
          <F label="ประสบการณ์ (ปี)"><input type="number" value={(form.experience_years as number) ?? 0} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} className={cls} /></F>
          <F label="ราคา/เซสชัน (THB)"><input type="number" value={(form.price_per_session as number) ?? 0} onChange={(e) => setForm({ ...form, price_per_session: e.target.value })} className={cls} /></F>
        </div>
        <F label="ความเชี่ยวชาญ (คั่นด้วย comma)"><input value={specStr} onChange={(e) => setForm({ ...form, specialties_str: e.target.value })} className={cls} placeholder="strength, hypertrophy, cardio" /></F>
        <F label="ใบรับรอง (คั่นด้วย comma)"><input value={certStr} onChange={(e) => setForm({ ...form, certifications_str: e.target.value })} className={cls} placeholder="NASM, ACE" /></F>
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="ชื่อฟิตเนส"><input value={(form.gym_name as string) ?? ""} onChange={(e) => setForm({ ...form, gym_name: e.target.value })} className={cls} /></F>
          <F label="สถานที่ฝึก"><input value={(form.training_location as string) ?? ""} onChange={(e) => setForm({ ...form, training_location: e.target.value })} className={cls} /></F>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <F label="สไตล์การฝึก">
            <select value={(form.training_style as string) ?? "flexible"} onChange={(e) => setForm({ ...form, training_style: e.target.value })} className={cls}>
              <option value="strict">{styleTh("strict")}</option>
              <option value="supportive">{styleTh("supportive")}</option>
              <option value="analytical">{styleTh("analytical")}</option>
              <option value="flexible">{styleTh("flexible")}</option>
            </select>
          </F>
          <F label="ระดับลูกค้าเป้าหมาย">
            <div className="flex flex-wrap gap-3 mt-2">
              {["beginner", "intermediate", "advanced"].map((level) => (
                <div key={level} className="flex items-center space-x-2">
                  <Checkbox
                    id={`level-${level}`}
                    checked={((form.target_client_level as string[]) ?? []).includes(level)}
                    onCheckedChange={(checked) => {
                      const current = (form.target_client_level as string[]) ?? [];
                      const next = checked ? [...current, level] : current.filter((v) => v !== level);
                      setForm({ ...form, target_client_level: next });
                    }}
                  />
                  <label htmlFor={`level-${level}`} className="text-sm font-medium cursor-pointer">{levelTh(level)}</label>
                </div>
              ))}
            </div>
          </F>
        </div>

        <F label="รูปแบบการฝึก">
          <div className="flex flex-wrap gap-4 mt-2">
            {["gym", "home", "online"].map((mod) => (
              <div key={mod} className="flex items-center space-x-2">
                <Checkbox
                  id={`mod-${mod}`}
                  checked={((form.training_modality as string[]) ?? []).includes(mod)}
                  onCheckedChange={(checked) => {
                    const current = (form.training_modality as string[]) ?? [];
                    const next = checked ? [...current, mod] : current.filter((v) => v !== mod);
                    setForm({ ...form, training_modality: next });
                  }}
                />
                <label htmlFor={`mod-${mod}`} className="text-sm font-medium cursor-pointer">{modalityTh(mod)}</label>
              </div>
            ))}
          </div>
        </F>

        <div className="grid gap-4 sm:grid-cols-2">
          <F label="ละติจูด"><input value={(form.latitude as number) ?? ""} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className={cls} /></F>
          <F label="ลองจิจูด"><input value={(form.longitude as number) ?? ""} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className={cls} /></F>
        </div>
        <button disabled={saving} className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-display font-bold text-primary-foreground disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} บันทึก
        </button>
      </form>
    </div>
  );
}

const cls = "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none";
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label><div className="mt-1">{children}</div></div>;
}
