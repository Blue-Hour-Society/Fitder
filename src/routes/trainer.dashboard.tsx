import { createFileRoute, Link } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  MessageCircle,
  Search,
  Star,
  UserRound,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { DailyReward } from "@/components/auth/DailyReward";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatTHB } from "@/lib/currency";
import { bookingStatusTh } from "@/lib/thai-labels";
import { toast } from "sonner";

export const Route = createFileRoute("/trainer/dashboard")({
  component: () => (
    <RoleGuard role="trainer">
      <Dash />
    </RoleGuard>
  ),
});

type TrainerBooking = {
  id: string;
  client_id: string;
  booking_status: string;
  total_price: number | null;
  commission_amount: number | null;
  net_amount: number | null;
  created_at: string;
  slot: {
    date: string;
    start_time: string;
    end_time: string;
  } | null;
  client_name: string | null;
};

type AvailabilitySlot = {
  id: string;
  is_booked: boolean;
  date: string;
  start_time: string;
  end_time: string;
};

type TrainerProfileSummary = {
  bio: string | null;
  specialties: string[] | null;
  experience_years: number | null;
  price_per_session: number | null;
  rating: number | null;
  rating_count: number | null;
  gym_name: string | null;
  training_location: string | null;
  auto_accept?: boolean | null;
};

type NextAction = {
  title: string;
  description: string;
  to: "/trainer/bookings" | "/trainer/availability" | "/trainer/profile" | "/trainer/clients";
  label: string;
  icon: typeof Calendar;
};

function Dash() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["trainer-dash", user?.id],
    queryFn: async () => {
      const [{ data: bookingRows }, { data: slots }, { data: trainerProfile }] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            "id, client_id, booking_status, total_price, commission_amount, net_amount, created_at, slot:availability_slots(date, start_time, end_time)",
          )
          .eq("trainer_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("availability_slots")
          .select("id, is_booked, date, start_time, end_time")
          .eq("trainer_id", user!.id),
        supabase
          .from("trainer_profiles")
          .select(
            "bio, specialties, experience_years, price_per_session, rating, rating_count, gym_name, training_location, auto_accept",
          )
          .eq("user_id", user!.id)
          .maybeSingle(),
      ]);

      const rows = (bookingRows ?? []) as unknown as Array<Omit<TrainerBooking, "client_name">>;
      const clientIds = [...new Set(rows.map((booking) => booking.client_id))];
      const { data: clientProfiles } = clientIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", clientIds)
        : { data: [] };
      const clientNames = new Map(
        (clientProfiles ?? []).map((client) => [client.id, client.full_name]),
      );

      const bookings = rows.map((booking) => ({
        ...booking,
        client_name: clientNames.get(booking.client_id) ?? null,
      }));

      return {
        bookings,
        slots: ((slots ?? []) as AvailabilitySlot[]) ?? [],
        trainerProfile: (trainerProfile as TrainerProfileSummary | null) ?? null,
      };
    },
    enabled: !!user,
  });

  const updateAutoAccept = useMutation({
    mutationFn: async (checked: boolean) => {
      const { error } = await supabase
        .from("trainer_profiles")
        .update({ auto_accept: checked } as any)
        .eq("user_id", user!.id);
      if (error) throw error;
      return checked;
    },
    onSuccess: (checked) => {
      queryClient.invalidateQueries({ queryKey: ["trainer-dash", user?.id] });
      toast.success(checked ? "เปิดรับอัตโนมัติแล้ว" : "ปิดรับอัตโนมัติแล้ว");
    },
    onError: (error: any) => {
      toast.error(error.message || "อัปเดตการตั้งค่าไม่สำเร็จ");
    },
  });

  const bookings = data?.bookings ?? [];
  const slots = data?.slots ?? [];
  const trainerProfile = data?.trainerProfile ?? null;
  const pendingBookings = bookings.filter((booking) => booking.booking_status === "pending");
  const upcomingBookings = getUpcomingBookings(bookings);
  const completedBookings = bookings.filter((booking) => booking.booking_status === "completed");
  const activeClientNames = getActiveClientNames(bookings);
  const bookedSlots = slots.filter((slot) => slot.is_booked);
  const availableSlots = slots.filter((slot) => !slot.is_booked);
  const profileMissing = getProfileMissingItems(trainerProfile);
  const nextAction = getNextAction({
    hasPendingBooking: pendingBookings.length > 0,
    hasUpcomingSession: upcomingBookings.length > 0,
    hasAvailability: availableSlots.length > 0,
    profileIncomplete: profileMissing.length > 0,
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Clock className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DailyReward />

      <Hero action={nextAction} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <main className="space-y-6">
          <PendingRequests bookings={pendingBookings} />
          <UpcomingSchedule bookings={upcomingBookings} />
          <ActiveClients clientNames={activeClientNames} />
        </main>

        <aside className="space-y-6">
          <RevenueSnapshot bookings={completedBookings} />
          <AvailabilityHealth
            total={slots.length}
            booked={bookedSlots.length}
            available={availableSlots.length}
          />
          <QuickActions />
          <ProfileRating
            profile={trainerProfile}
            missingItems={profileMissing}
            autoAcceptPending={updateAutoAccept.isPending}
            onAutoAcceptChange={(checked) => updateAutoAccept.mutate(checked)}
          />
          <AiOpportunityCard />
        </aside>
      </div>
    </div>
  );
}

function getNextAction({
  hasPendingBooking,
  hasUpcomingSession,
  hasAvailability,
  profileIncomplete,
}: {
  hasPendingBooking: boolean;
  hasUpcomingSession: boolean;
  hasAvailability: boolean;
  profileIncomplete: boolean;
}): NextAction {
  if (hasPendingBooking) {
    return {
      title: "มีคำขอจองที่รอคุณตอบรับ",
      description: "ตอบรับคำขอเร็วขึ้นเพื่อเปลี่ยน lead ให้เป็นรายได้จริง",
      to: "/trainer/bookings",
      label: "จัดการคำขอจอง",
      icon: Clock,
    };
  }
  if (hasUpcomingSession) {
    return {
      title: "เตรียมตัวสำหรับเซสชันถัดไป",
      description: "ตรวจเวลานัดและรายชื่อลูกค้า เพื่อให้การฝึกต่อเนื่อง",
      to: "/trainer/bookings",
      label: "ดูการจอง",
      icon: Calendar,
    };
  }
  if (!hasAvailability) {
    return {
      title: "เปิดช่วงเวลาว่างเพื่อรับลูกค้าเพิ่ม",
      description: "ลูกค้าจองได้ก็ต่อเมื่อคุณมี slot ที่เปิดอยู่",
      to: "/trainer/availability",
      label: "เพิ่มเวลาว่าง",
      icon: Zap,
    };
  }
  if (profileIncomplete) {
    return {
      title: "เติมโปรไฟล์ให้พร้อมขาย",
      description: "ข้อมูลราคา ประสบการณ์ และสถานที่ช่วยให้ลูกค้าตัดสินใจจองได้ง่ายขึ้น",
      to: "/trainer/profile",
      label: "อัปเดตโปรไฟล์",
      icon: UserRound,
    };
  }
  return {
    title: "ติดตามลูกค้าและรักษา momentum",
    description: "ดูรายชื่อลูกค้า พูดคุย และทำให้ booking ถัดไปเกิดขึ้นง่ายขึ้น",
    to: "/trainer/clients",
    label: "ดูลูกค้า",
    icon: Users,
  };
}

function getUpcomingBookings(bookings: TrainerBooking[]) {
  const now = new Date();
  return bookings
    .filter(
      (booking) =>
        (booking.booking_status === "accepted" || booking.booking_status === "pending") &&
        booking.slot?.date &&
        booking.slot?.start_time,
    )
    .map((booking) => ({
      ...booking,
      startsAt: new Date(`${booking.slot!.date}T${booking.slot!.start_time}`),
    }))
    .filter((booking) => booking.startsAt >= now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

function getActiveClientNames(bookings: TrainerBooking[]) {
  const names = new Map<string, string>();
  bookings
    .filter(
      (booking) => booking.booking_status === "accepted" || booking.booking_status === "completed",
    )
    .forEach((booking) => {
      names.set(booking.client_id, booking.client_name ?? "ลูกค้า");
    });
  return [...names.values()];
}

function getProfileMissingItems(profile: TrainerProfileSummary | null) {
  const missing: string[] = [];
  if (!profile?.bio) missing.push("คำแนะนำตัว");
  if (!profile?.price_per_session) missing.push("ราคา/เซสชัน");
  if (!profile?.experience_years) missing.push("ประสบการณ์");
  if (!profile?.gym_name && !profile?.training_location) missing.push("สถานที่ฝึก");
  if (!profile?.specialties || profile.specialties.length === 0) missing.push("ความเชี่ยวชาญ");
  return missing;
}

function Hero({ action }: { action: NextAction }) {
  const Icon = action.icon;
  return (
    <section className="rounded-xl border border-primary/40 bg-primary/10 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary">
            Trainer Command Center
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold">ภาพรวมสำหรับเทรนเนอร์</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            ดูสิ่งที่ต้องทำต่อ จัดการคำขอจอง เปิดเวลาว่าง ดูลูกค้า และติดตามรายได้จากข้อมูลจริง
          </p>
        </div>
        <Link
          to={action.to}
          className="group flex min-w-0 max-w-xl flex-col gap-3 rounded-lg border border-primary/40 bg-background/70 p-4 transition hover:border-primary sm:flex-row sm:items-center"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-widest text-primary">Next Best Action</div>
            <div className="mt-1 font-display text-lg font-bold">{action.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
          </div>
          <div className="inline-flex items-center gap-2 text-sm font-bold text-primary">
            {action.label}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </div>
        </Link>
      </div>
    </section>
  );
}

function PendingRequests({ bookings }: { bookings: TrainerBooking[] }) {
  return (
    <Panel>
      <SectionHeader
        icon={Clock}
        title="คำขอจองที่รออนุมัติ"
        subtitle="โอกาสรายได้ที่ต้องตอบกลับ"
      />
      {bookings.length === 0 ? (
        <EmptyState title="ไม่มีคำขอจองที่รออยู่" text="เมื่อมีลูกค้าจอง เซสชันใหม่จะแสดงตรงนี้" />
      ) : (
        <div className="mt-4 space-y-3">
          {bookings.slice(0, 3).map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
          <DashboardLink to="/trainer/bookings" label="ดูคำขอทั้งหมด" />
        </div>
      )}
    </Panel>
  );
}

function UpcomingSchedule({ bookings }: { bookings: ReturnType<typeof getUpcomingBookings> }) {
  return (
    <Panel>
      <SectionHeader
        icon={Calendar}
        title="ตารางถัดไป"
        subtitle="เซสชัน pending/accepted ที่มีวันเวลาในอนาคต"
      />
      {bookings.length === 0 ? (
        <EmptyState
          title="ยังไม่มีเซสชันที่กำลังจะมาถึง"
          text="เปิดเวลาว่างเพิ่ม เพื่อให้ลูกค้าสามารถจองเซสชันกับคุณได้"
          to="/trainer/availability"
          cta="เพิ่มเวลาว่าง"
        />
      ) : (
        <div className="mt-4 space-y-3">
          {bookings.slice(0, 4).map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
          <DashboardLink to="/trainer/bookings" label="ดูการจองทั้งหมด" />
        </div>
      )}
    </Panel>
  );
}

function BookingRow({ booking }: { booking: TrainerBooking }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-display text-lg font-semibold">{booking.client_name ?? "ลูกค้า"}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {formatDate(booking.slot?.date)} เวลา {booking.slot?.start_time?.slice(0, 5) ?? "-"} -{" "}
          {booking.slot?.end_time?.slice(0, 5) ?? "-"}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          {bookingStatusTh(booking.booking_status as never)}
        </span>
        <Link to="/trainer/bookings" className="text-sm font-semibold text-primary hover:underline">
          View Booking
        </Link>
      </div>
    </div>
  );
}

function ActiveClients({ clientNames }: { clientNames: string[] }) {
  return (
    <Panel>
      <SectionHeader
        icon={Users}
        title="ลูกค้าที่กำลังดูแล"
        subtitle="จาก booking ที่ accepted หรือ completed"
      />
      {clientNames.length === 0 ? (
        <EmptyState
          title="ยังไม่มีลูกค้าที่ active"
          text="เมื่อมีการจองที่ยืนยันแล้ว รายชื่อลูกค้าจะปรากฏในส่วนนี้"
          to="/trainer/availability"
          cta="เปิดเวลาว่าง"
        />
      ) : (
        <div className="mt-5 space-y-4">
          <div className="font-display text-4xl font-bold text-primary">{clientNames.length}</div>
          <div className="grid gap-3 sm:grid-cols-3">
            {clientNames.slice(0, 3).map((name) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                  {name[0]?.toUpperCase() ?? <UserRound className="h-4 w-4" />}
                </div>
                <div className="truncate text-sm font-semibold">{name}</div>
              </div>
            ))}
          </div>
          <DashboardLink to="/trainer/clients" label="ดูลูกค้าทั้งหมด" />
        </div>
      )}
    </Panel>
  );
}

function RevenueSnapshot({ bookings }: { bookings: TrainerBooking[] }) {
  const gross = bookings.reduce((sum, booking) => sum + Number(booking.total_price ?? 0), 0);
  const commission = bookings.reduce((sum, booking) => {
    const fallback = Number(booking.total_price ?? 0) * 0.1;
    return sum + Number(booking.commission_amount ?? fallback);
  }, 0);
  const net = bookings.reduce((sum, booking) => {
    const fallback = Number(booking.total_price ?? 0) * 0.9;
    return sum + Number(booking.net_amount ?? fallback);
  }, 0);

  return (
    <Panel>
      <SectionHeader
        icon={Wallet}
        title="Revenue Snapshot"
        subtitle="จาก completed bookings เท่านั้น"
      />
      <div className="mt-5 grid gap-3">
        <Metric label="เซสชันที่เสร็จสิ้น" value={bookings.length} icon={CheckCircle2} />
        <Metric label="รายได้รวม" value={formatTHB(gross)} icon={Wallet} />
        <Metric label="รายได้สุทธิ" value={formatTHB(net)} icon={Wallet} highlight />
        <Metric label="ค่าคอมมิชชั่น" value={formatTHB(commission)} icon={Activity} />
      </div>
      <DashboardLink to="/trainer/earnings" label="ดูรายละเอียดรายได้" />
    </Panel>
  );
}

function AvailabilityHealth({
  total,
  booked,
  available,
}: {
  total: number;
  booked: number;
  available: number;
}) {
  return (
    <Panel>
      <SectionHeader icon={Zap} title="Availability Health" subtitle="ความพร้อมในการรับ booking" />
      <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        <Metric label="ทั้งหมด" value={total} icon={Calendar} />
        <Metric label="ถูกจอง" value={booked} icon={CheckCircle2} />
        <Metric label="ยังว่าง" value={available} icon={Clock} highlight />
      </div>
      <DashboardLink to="/trainer/availability" label="Add Availability" />
    </Panel>
  );
}

function QuickActions() {
  const actions = [
    { label: "Manage Bookings", to: "/trainer/bookings" as const, icon: Calendar },
    { label: "Manage Availability", to: "/trainer/availability" as const, icon: Zap },
    { label: "View Clients", to: "/trainer/clients" as const, icon: Users },
    { label: "Open Chat", to: "/trainer/chat" as const, icon: MessageCircle },
  ];

  return (
    <Panel>
      <SectionHeader icon={Search} title="Quick Actions" subtitle="ไปยังงานสำคัญของ trainer" />
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm font-semibold transition hover:border-primary hover:text-primary"
          >
            <action.icon className="h-4 w-4 text-primary" />
            {action.label}
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function ProfileRating({
  profile,
  missingItems,
  autoAcceptPending,
  onAutoAcceptChange,
}: {
  profile: TrainerProfileSummary | null;
  missingItems: string[];
  autoAcceptPending: boolean;
  onAutoAcceptChange: (checked: boolean) => void;
}) {
  return (
    <Panel>
      <SectionHeader
        icon={Star}
        title="Profile / Rating"
        subtitle="ข้อมูลที่ลูกค้าใช้ตัดสินใจก่อนจอง"
      />
      <div className="mt-5 space-y-3">
        <Metric
          label="Rating"
          value={`${Number(profile?.rating ?? 0).toFixed(1)} / 5`}
          icon={Star}
        />
        <Metric label="Reviews" value={profile?.rating_count ?? 0} icon={Users} />
        <Metric
          label="ราคา/เซสชัน"
          value={formatTHB(profile?.price_per_session ?? 0)}
          icon={Wallet}
        />

        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold">รับลูกค้าอัตโนมัติ</div>
              <p className="mt-1 text-xs text-muted-foreground">
                ใช้เมื่อคุณมั่นใจว่า availability พร้อมรับ booking ทันที
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="trainer-auto-accept"
                checked={Boolean(profile?.auto_accept)}
                onCheckedChange={onAutoAcceptChange}
                disabled={autoAcceptPending}
              />
              <Label htmlFor="trainer-auto-accept">{profile?.auto_accept ? "เปิด" : "ปิด"}</Label>
            </div>
          </div>
        </div>

        {missingItems.length > 0 ? (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
            <div className="font-semibold text-warning">โปรไฟล์ยังควรเติมข้อมูล</div>
            <p className="mt-1 text-sm text-muted-foreground">{missingItems.join(", ")}</p>
            <DashboardLink to="/trainer/profile" label="อัปเดตโปรไฟล์" />
          </div>
        ) : (
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-muted-foreground">
            โปรไฟล์มีข้อมูลหลักพร้อมให้ลูกค้าพิจารณาแล้ว
          </div>
        )}
      </div>
    </Panel>
  );
}

function AiOpportunityCard() {
  return (
    <Panel>
      <SectionHeader
        icon={Bot}
        title="AI Coaching Insights"
        subtitle="Roadmap ที่เคารพความเป็นส่วนตัวของลูกค้า"
      />
      <p className="mt-4 text-sm text-muted-foreground">
        เมื่อผู้ใช้งานยินยอมแชร์ข้อมูล AI คุณจะสามารถดูข้อมูลการฝึกเพื่อช่วยปรับฟอร์มได้ ตอนนี้
        dashboard จะไม่อ่านคะแนน AI ของลูกค้า เพื่อเคารพสิทธิ์การเข้าถึงข้อมูลและ RLS
      </p>
      <div className="mt-4 rounded-lg border border-border bg-background p-4 text-xs text-muted-foreground">
        Product loop: ลูกค้าใช้ AI ตรวจท่า → เลือกแชร์ insight → เทรนเนอร์ช่วยปรับฟอร์ม → เกิด
        booking และรายได้ซ้ำ
      </div>
    </Panel>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: typeof Calendar;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className={`mt-1 font-display text-xl font-bold ${highlight ? "text-primary" : ""}`}>
          {value}
        </div>
      </div>
      <Icon className="h-4 w-4 shrink-0 text-primary" />
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Calendar;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-5">{children}</section>;
}

function EmptyState({
  title,
  text,
  to,
  cta,
}: {
  title: string;
  text: string;
  to?: "/trainer/bookings" | "/trainer/availability" | "/trainer/clients" | "/trainer/profile";
  cta?: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
      <div className="font-display text-lg font-semibold">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      {to && cta && (
        <Link
          to={to}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          {cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function DashboardLink({
  to,
  label,
}: {
  to:
    | "/trainer/bookings"
    | "/trainer/availability"
    | "/trainer/clients"
    | "/trainer/earnings"
    | "/trainer/profile";
  label: string;
}) {
  return (
    <Link
      to={to}
      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("th-TH", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
