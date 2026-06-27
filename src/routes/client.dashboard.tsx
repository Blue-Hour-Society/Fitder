import { createFileRoute, Link } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchRankedTrainers } from "@/lib/trainers";
import { TrainerCard } from "@/components/trainers/TrainerCard";
import {
  Activity,
  ArrowRight,
  Award,
  Calendar,
  Dumbbell,
  Gift,
  LineChart as LineChartIcon,
  Loader2,
  Search,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { DailyReward } from "@/components/auth/DailyReward";
import { goalTh } from "@/lib/thai-labels";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/client/dashboard")({
  component: () => (
    <RoleGuard role="client">
      <ClientDashboard />
    </RoleGuard>
  ),
});

type ClientBooking = {
  id: string;
  trainer_id: string;
  slot_id: string;
  booking_status: string;
  total_price: number | null;
  created_at: string;
  slot: {
    id: string;
    trainer_id: string;
    date: string;
    start_time: string;
    end_time: string;
  } | null;
  trainer_name: string | null;
};

type PoseSession = {
  id: string;
  exercise_name: string;
  accuracy_score: number | null;
  created_at: string;
};

type NextAction = {
  title: string;
  description: string;
  to: "/client/profile" | "/client/pose" | "/client/discover" | "/client/bookings";
  label: string;
  icon: typeof UserRound;
};

const SCORE_THRESHOLD = 75;

function ClientDashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: ranked, isLoading: trainersLoading } = useQuery({
    queryKey: ["ranked-trainers", profile?.id, profile?.fitness_goal],
    queryFn: () =>
      fetchRankedTrainers({
        fitness_goal: profile?.fitness_goal,
        budget_min: profile?.budget_min,
        budget_max: profile?.budget_max,
        preferred_trainer_gender: profile?.preferred_trainer_gender,
        preferred_experience: profile?.preferred_experience,
        experience_level: profile?.experience_level,
        latitude: profile?.latitude,
        longitude: profile?.longitude,
        training_style_pref: profile?.preferred_style,
        sessions_per_week_pref: profile?.sessions_per_week,
        training_modality_pref: profile?.training_modality,
      }),
    enabled: !!profile,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["client-dashboard-bookings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select(
          "id, trainer_id, slot_id, booking_status, total_price, created_at, slot:availability_slots(id, trainer_id, date, start_time, end_time)",
        )
        .eq("client_id", user!.id)
        .order("created_at", { ascending: false });

      const rows = (data ?? []) as unknown as Array<Omit<ClientBooking, "trainer_name">>;
      const trainerIds = [...new Set(rows.map((booking) => booking.trainer_id))];
      const { data: profiles } = trainerIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", trainerIds)
        : { data: [] };
      const trainerNames = new Map(
        (profiles ?? []).map((trainer) => [trainer.id, trainer.full_name]),
      );

      return rows.map((booking) => ({
        ...booking,
        trainer_name: trainerNames.get(booking.trainer_id) ?? null,
      }));
    },
    enabled: !!user,
  });

  const { data: poseSessions = [], isLoading: posesLoading } = useQuery({
    queryKey: ["client-dashboard-pose-sessions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pose_sessions")
        .select("id, exercise_name, accuracy_score, created_at")
        .eq("client_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data ?? []) as PoseSession[];
    },
    enabled: !!user,
  });

  const profileComplete = Boolean(
    profile?.fitness_goal &&
    profile?.budget_max &&
    profile?.experience_level &&
    profile?.training_modality &&
    profile?.sessions_per_week,
  );
  const upcomingBooking = getUpcomingBooking(bookings);
  const activeBookings = bookings.filter(
    (booking) => booking.booking_status === "accepted" || booking.booking_status === "pending",
  );
  const completedBookings = bookings.filter((booking) => booking.booking_status === "completed");
  const validScores = poseSessions
    .map((session) =>
      typeof session.accuracy_score === "number" && Number.isFinite(session.accuracy_score)
        ? Number(session.accuracy_score)
        : null,
    )
    .filter((score): score is number => score !== null);
  const latestPose = poseSessions.find(
    (session) =>
      typeof session.accuracy_score === "number" && Number.isFinite(session.accuracy_score),
  );
  const latestScore =
    typeof latestPose?.accuracy_score === "number"
      ? Math.round(Number(latestPose.accuracy_score))
      : null;
  const averageScore =
    validScores.length > 0
      ? Math.round(validScores.reduce((total, score) => total + score, 0) / validScores.length)
      : null;
  const bestScore = validScores.length > 0 ? Math.round(Math.max(...validScores)) : null;
  const trainerCards = (ranked ?? []).slice(0, 3);
  const nextAction = getNextAction({
    profileComplete,
    hasPoseSession: poseSessions.length > 0,
    hasUpcomingBooking: Boolean(upcomingBooking),
  });

  return (
    <div className="space-y-8">
      <DailyReward />

      <header className="space-y-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary">
            Client Command Center
          </div>
          <h1 className="mt-1 font-display text-4xl font-bold">
            สวัสดี {profile?.full_name || "ยินดีต้อนรับ"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            ดูความคืบหน้าจาก AI ตรวจท่า จัดการการจอง และเลือกขั้นตอนถัดไปจากข้อมูลจริงของคุณ
          </p>
        </div>

        <NextActionCard action={nextAction} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <QuickActions className="order-1 lg:col-start-2 lg:row-start-1" />

        <UpcomingSession
          booking={upcomingBooking}
          isLoading={bookingsLoading}
          className="order-2 lg:col-start-2 lg:row-start-2"
        />

        <AiFormSummary
          latestPose={latestPose}
          latestScore={latestScore}
          averageScore={averageScore}
          bestScore={bestScore}
          sessionCount={poseSessions.length}
          isLoading={posesLoading}
          className="order-3 lg:col-start-1 lg:row-start-1"
        />

        <AiTrendChart
          sessions={poseSessions}
          isLoading={posesLoading}
          className="order-4 lg:col-start-1 lg:row-start-2"
        />

        <AiTrainerCta
          latestScore={latestScore}
          averageScore={averageScore}
          className="order-5 lg:col-start-2 lg:row-start-3"
        />

        <RewardsCard
          rewardPoints={profile?.reward_points ?? 0}
          className="order-6 lg:col-start-2 lg:row-start-4"
        />

        {!profileComplete && (
          <ProfileCompletionCard
            profile={profile}
            className="order-7 lg:col-start-2 lg:row-start-5"
          />
        )}

        <TrainingActivitySummary
          activeBookings={activeBookings.length}
          completedBookings={completedBookings.length}
          poseSessionCount={poseSessions.length}
          fitnessGoal={profile?.fitness_goal}
          sessionsPerWeek={profile?.sessions_per_week}
          className="order-8 lg:col-start-1 lg:row-start-3"
        />

        <RecommendedTrainers
          trainers={trainerCards}
          isLoading={trainersLoading}
          className="order-9 lg:col-start-1 lg:row-start-4"
        />
      </div>
    </div>
  );
}

function getNextAction({
  profileComplete,
  hasPoseSession,
  hasUpcomingBooking,
}: {
  profileComplete: boolean;
  hasPoseSession: boolean;
  hasUpcomingBooking: boolean;
}): NextAction {
  if (!profileComplete) {
    return {
      title: "เริ่มจากโปรไฟล์ให้ครบ",
      description: "ข้อมูลเป้าหมาย งบประมาณ และสไตล์การฝึกช่วยให้ Fitder แนะนำเทรนเนอร์ได้ตรงขึ้น",
      to: "/client/profile",
      label: "กรอกโปรไฟล์",
      icon: UserRound,
    };
  }
  if (!hasPoseSession) {
    return {
      title: "ลองตรวจท่าด้วย AI ครั้งแรก",
      description: "อัปโหลดวิดีโอเพื่อดูคะแนนฟอร์มจริง แล้วใช้ผลลัพธ์วางแผนการฝึกถัดไป",
      to: "/client/pose",
      label: "เริ่มตรวจท่า",
      icon: Activity,
    };
  }
  if (!hasUpcomingBooking) {
    return {
      title: "เลือกเทรนเนอร์สำหรับเป้าหมายของคุณ",
      description: "ใช้ผล AI และ preference ของคุณประกอบการเลือกเทรนเนอร์ที่เหมาะที่สุด",
      to: "/client/discover",
      label: "จองเทรนเนอร์",
      icon: Search,
    };
  }
  return {
    title: "คุณมีเซสชันที่กำลังจะมาถึง",
    description: "ตรวจวันเวลาและสถานะการจอง เพื่อเตรียมตัวก่อนเริ่มฝึก",
    to: "/client/bookings",
    label: "ดูการจอง",
    icon: Calendar,
  };
}

function getUpcomingBooking(bookings: ClientBooking[]) {
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
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
}

function NextActionCard({ action }: { action: NextAction }) {
  const Icon = action.icon;
  return (
    <Link
      to={action.to}
      className="group flex flex-col gap-4 rounded-xl border border-primary/40 bg-primary/10 p-5 transition hover:border-primary hover:bg-primary/15 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-primary">ขั้นตอนถัดไป</div>
          <h2 className="mt-1 font-display text-xl font-bold">{action.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
        </div>
      </div>
      <div className="inline-flex items-center gap-2 self-start rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground sm:self-center">
        {action.label}
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function QuickActions({ className }: { className?: string }) {
  const actions = [
    { label: "ตรวจท่าด้วย AI", to: "/client/pose" as const, icon: Activity },
    { label: "จองเทรนเนอร์", to: "/client/discover" as const, icon: Search },
    { label: "ดูการจอง", to: "/client/bookings" as const, icon: Calendar },
    { label: "กรอกโปรไฟล์", to: "/client/profile" as const, icon: UserRound },
  ];

  return (
    <Panel className={className}>
      <SectionHeader icon={Target} title="Quick Actions" subtitle="ไปยัง flow สำคัญได้ทันที" />
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 text-sm font-semibold transition hover:border-primary hover:text-primary"
          >
            <action.icon className="h-4 w-4 text-primary" />
            {action.label}
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function UpcomingSession({
  booking,
  isLoading,
  className,
}: {
  booking: ReturnType<typeof getUpcomingBooking>;
  isLoading: boolean;
  className?: string;
}) {
  if (isLoading) {
    return (
      <Panel className={`flex h-40 items-center justify-center ${className ?? ""}`}>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </Panel>
    );
  }

  return (
    <Panel className={className}>
      <SectionHeader
        icon={Calendar}
        title="เซสชันถัดไป"
        subtitle="อ้างอิงจาก booking และช่วงเวลาจริง"
      />
      {booking ? (
        <div className="mt-4 space-y-4">
          <div>
            <div className="font-display text-2xl font-bold">
              {formatDate(booking.slot?.date)} เวลา {booking.slot?.start_time.slice(0, 5)}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              กับ {booking.trainer_name ?? "เทรนเนอร์"} ถึง {booking.slot?.end_time.slice(0, 5)}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
            <span className="text-muted-foreground">สถานะ</span>
            <span className="font-semibold text-primary">{booking.booking_status}</span>
          </div>
          <Link
            to="/client/bookings"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            ดูรายละเอียดการจอง
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <EmptyState
          compact
          title="ยังไม่มีเซสชันที่กำลังจะมาถึง"
          text="เลือกเทรนเนอร์ที่เหมาะกับเป้าหมาย แล้วจองช่วงเวลาที่สะดวก"
          to="/client/discover"
          cta="หาเทรนเนอร์"
        />
      )}
    </Panel>
  );
}

function AiFormSummary({
  latestPose,
  latestScore,
  averageScore,
  bestScore,
  sessionCount,
  isLoading,
  className,
}: {
  latestPose?: PoseSession;
  latestScore: number | null;
  averageScore: number | null;
  bestScore: number | null;
  sessionCount: number;
  isLoading: boolean;
  className?: string;
}) {
  if (isLoading) {
    return (
      <Panel className={`flex h-52 items-center justify-center ${className ?? ""}`}>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </Panel>
    );
  }

  if (latestScore === null) {
    return (
      <Panel className={className}>
        <SectionHeader
          icon={Activity}
          title="AI Form Summary"
          subtitle="ยังไม่มีผลตรวจท่าจริงในระบบ"
        />
        <EmptyState
          compact
          title="เริ่มสร้าง baseline ของฟอร์มคุณ"
          text="ตรวจท่าด้วย AI เพื่อบันทึกคะแนนจริง และดูความคืบหน้าใน dashboard"
          to="/client/pose"
          cta="เริ่มตรวจท่า"
        />
      </Panel>
    );
  }

  return (
    <Panel className={className}>
      <SectionHeader
        icon={Activity}
        title="AI Form Summary"
        subtitle="สรุปจาก pose sessions ล่าสุดของคุณ"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MetricCard label="คะแนนล่าสุด" value={`${latestScore}%`} icon={Target} />
        <MetricCard
          label="ค่าเฉลี่ยล่าสุด"
          value={averageScore !== null ? `${averageScore}%` : "-"}
          icon={LineChartIcon}
        />
        <MetricCard
          label="ดีที่สุด"
          value={bestScore !== null ? `${bestScore}%` : "-"}
          icon={Award}
        />
      </div>
      <div className="mt-4 rounded-lg border border-border bg-background p-4 text-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold">{latestPose?.exercise_name ?? "AI pose session"}</div>
            <div className="text-muted-foreground">
              ตรวจล่าสุด {latestPose?.created_at ? formatDate(latestPose.created_at) : "-"}
            </div>
          </div>
          <div className="text-muted-foreground">บันทึกทั้งหมด {sessionCount} ครั้ง</div>
        </div>
      </div>
    </Panel>
  );
}

function AiTrendChart({
  sessions,
  isLoading,
  className,
}: {
  sessions: PoseSession[];
  isLoading: boolean;
  className?: string;
}) {
  const chartData = sessions
    .filter(
      (session) =>
        typeof session.accuracy_score === "number" && Number.isFinite(session.accuracy_score),
    )
    .slice()
    .reverse()
    .map((session, index) => ({
      label: `${index + 1}`,
      date: formatShortDate(session.created_at),
      score: Math.round(Number(session.accuracy_score)),
      exercise: session.exercise_name,
    }));

  if (isLoading) {
    return (
      <Panel className={`flex h-72 items-center justify-center ${className ?? ""}`}>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </Panel>
    );
  }

  return (
    <Panel className={className}>
      <SectionHeader
        icon={LineChartIcon}
        title="AI Form Trend"
        subtitle="แสดงคะแนนจริงจาก 5-10 ครั้งล่าสุด"
      />
      {chartData.length < 2 ? (
        <EmptyState
          compact
          title={chartData.length === 1 ? "มีข้อมูล 1 ครั้งแล้ว" : "ยังไม่มีข้อมูลพอสำหรับกราฟ"}
          text={
            chartData.length === 1
              ? "ตรวจท่าอีกอย่างน้อย 1 ครั้ง เพื่อเริ่มเห็นแนวโน้มคะแนน"
              : "เริ่มตรวจท่าด้วย AI เพื่อสร้างกราฟความคืบหน้าจากข้อมูลจริง"
          }
          to="/client/pose"
          cta="ตรวจท่าด้วย AI"
        />
      ) : (
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: -20, right: 12, top: 10, bottom: 0 }}>
              <CartesianGrid stroke="oklch(0.30 0 0)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "oklch(0.70 0 0)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "oklch(0.70 0 0)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.22 0 0)",
                  border: "1px solid oklch(0.30 0 0)",
                  borderRadius: 8,
                  color: "oklch(0.98 0 0)",
                }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.exercise ?? "AI score"}
                formatter={(value) => [`${value}%`, "คะแนนฟอร์ม"]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="oklch(0.92 0.22 119)"
                strokeWidth={3}
                dot={{ r: 4, fill: "oklch(0.92 0.22 119)", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

function TrainingActivitySummary({
  activeBookings,
  completedBookings,
  poseSessionCount,
  fitnessGoal,
  sessionsPerWeek,
  className,
}: {
  activeBookings: number;
  completedBookings: number;
  poseSessionCount: number;
  fitnessGoal?: string | null;
  sessionsPerWeek?: number | null;
  className?: string;
}) {
  return (
    <Panel className={className}>
      <SectionHeader
        icon={Dumbbell}
        title="Training Activity"
        subtitle="ไม่ใช้ streak ปลอม แสดงเฉพาะกิจกรรมที่มีข้อมูลจริง"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="AI sessions" value={poseSessionCount} icon={Activity} />
        <MetricCard label="การจองที่ใช้งาน" value={activeBookings} icon={Calendar} />
        <MetricCard label="สำเร็จแล้ว" value={completedBookings} icon={Award} />
        <MetricCard label="เป้าหมาย" value={goalTh(fitnessGoal)} icon={Target} />
      </div>
      {sessionsPerWeek ? (
        <p className="mt-4 text-sm text-muted-foreground">
          ความถี่ที่ตั้งไว้: {sessionsPerWeek} ครั้งต่อสัปดาห์
          ข้อมูลนี้ใช้ช่วยจัดอันดับเทรนเนอร์ที่เวลาตรงกับคุณ
        </p>
      ) : null}
    </Panel>
  );
}

function AiTrainerCta({
  latestScore,
  averageScore,
  className,
}: {
  latestScore: number | null;
  averageScore: number | null;
  className?: string;
}) {
  const needsTrainer =
    (latestScore !== null && latestScore < SCORE_THRESHOLD) ||
    (averageScore !== null && averageScore < SCORE_THRESHOLD);

  return (
    <Panel
      className={`${className ?? ""} ${needsTrainer ? "border-primary/50 bg-primary/10" : ""}`}
    >
      <SectionHeader
        icon={Sparkles}
        title="AI สู่การฝึกจริง"
        subtitle="ใช้ผลตรวจท่าเพื่อเลือก action ถัดไป"
      />
      <div className="mt-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          {needsTrainer
            ? "ท่ายังไม่เป๊ะ? จองเทรนเนอร์เพื่อช่วยปรับฟอร์ม"
            : latestScore === null
              ? "ลองตรวจท่าด้วย AI เพื่อดูว่าควรปรับตรงไหน"
              : "คะแนนฟอร์มดูดีแล้ว ถ้าต้องการพัฒนาต่อ ลองหาเทรนเนอร์ที่ตรงกับเป้าหมาย"}
        </p>
        <Link
          to={needsTrainer || latestScore !== null ? "/client/discover" : "/client/pose"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
        >
          {needsTrainer || latestScore !== null ? "จองเทรนเนอร์" : "ตรวจท่าด้วย AI"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Panel>
  );
}

function RewardsCard({ rewardPoints, className }: { rewardPoints: number; className?: string }) {
  return (
    <Panel className={className}>
      <SectionHeader icon={Gift} title="Rewards" subtitle="แต้มจากระบบจริง ไม่สร้าง streak เพิ่ม" />
      <div className="mt-4 flex items-end justify-between rounded-lg border border-border bg-background p-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">คะแนนสะสม</div>
          <div className="mt-1 font-display text-4xl font-bold text-primary">{rewardPoints}</div>
        </div>
        <Gift className="h-8 w-8 text-primary" />
      </div>
    </Panel>
  );
}

function ProfileCompletionCard({
  profile,
  className,
}: {
  profile: { [key: string]: unknown } | null | undefined;
  className?: string;
}) {
  const items = [
    { label: "เป้าหมาย", done: Boolean(profile?.fitness_goal) },
    { label: "งบประมาณ", done: Boolean(profile?.budget_max) },
    { label: "ระดับประสบการณ์", done: Boolean(profile?.experience_level) },
    { label: "รูปแบบการฝึก", done: Boolean(profile?.training_modality) },
    { label: "จำนวนครั้งต่อสัปดาห์", done: Boolean(profile?.sessions_per_week) },
  ];
  const completed = items.filter((item) => item.done).length;

  return (
    <Panel className={className}>
      <SectionHeader
        icon={UserRound}
        title="โปรไฟล์สำหรับการ match"
        subtitle={`${completed}/${items.length} รายการครบแล้ว`}
      />
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-md bg-background px-3 py-2 text-sm"
          >
            <span className="text-muted-foreground">{item.label}</span>
            <span className={item.done ? "font-semibold text-primary" : "text-muted-foreground"}>
              {item.done ? "ครบ" : "ยังไม่ครบ"}
            </span>
          </div>
        ))}
      </div>
      <Link
        to="/client/profile"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary hover:text-primary"
      >
        อัปเดตโปรไฟล์
      </Link>
    </Panel>
  );
}

function RecommendedTrainers({
  trainers,
  isLoading,
  className,
}: {
  trainers: NonNullable<Awaited<ReturnType<typeof fetchRankedTrainers>>>;
  isLoading: boolean;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">เทรนเนอร์ที่เหมาะกับคุณ</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            แสดงจาก preference และข้อมูลเทรนเนอร์จริงในระบบ
          </p>
        </div>
        <Link
          to="/client/discover"
          className="shrink-0 text-sm font-semibold text-primary hover:underline"
        >
          ดูทั้งหมด
        </Link>
      </div>
      {isLoading ? (
        <Panel className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </Panel>
      ) : trainers.length === 0 ? (
        <EmptyState
          title="ยังไม่มีเทรนเนอร์ที่แนะนำได้"
          text="กรอกเป้าหมาย งบประมาณ และรูปแบบการฝึก เพื่อให้ระบบจัดอันดับได้แม่นขึ้น"
          to="/client/profile"
          cta="อัปเดตโปรไฟล์"
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {trainers.map((trainer) => (
            <TrainerCard key={trainer.user_id} trainer={trainer} match={trainer.match} />
          ))}
        </div>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 shrink-0 text-primary" />
      </div>
      <div className="mt-3 font-display text-2xl font-bold capitalize">{value}</div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Activity;
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

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  text,
  to,
  cta,
  compact = false,
}: {
  title: string;
  text: string;
  to?: "/client/profile" | "/client/pose" | "/client/discover" | "/client/bookings";
  cta?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-5 text-center ${
        compact ? "mt-4 min-h-40 py-6" : "min-h-48 py-8"
      }`}
    >
      <div className="font-display text-lg font-semibold">{title}</div>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{text}</p>
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

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("th-TH", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", {
    month: "short",
    day: "numeric",
  });
}
