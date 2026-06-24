import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/layout/Logo";
import {
  Bell,
  LayoutDashboard,
  Search,
  Calendar,
  History,
  Sparkles,
  User,
  LogOut,
  Users,
  ShieldCheck,
  BarChart3,
  CalendarRange,
  Wallet,
  Activity,
  MessageCircle,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { to: string; label: string; icon: typeof Search };
type TrainerNotification = {
  id: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
};
type TrainerInboxItem = TrainerNotification & {
  source: "notification" | "booking";
};

const navByRole: Record<AppRole, NavItem[]> = {
  client: [
    { to: "/client/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
    { to: "/client/discover", label: "ค้นหาเทรนเนอร์", icon: Search },
    { to: "/client/matches", label: "แมตช์ของฉัน", icon: Sparkles },
    { to: "/client/chat", label: "แชท", icon: MessageCircle },
    { to: "/client/bookings", label: "การจอง", icon: History },
    { to: "/client/pose", label: "ตรวจท่าด้วย AI", icon: Activity },
    { to: "/client/profile", label: "โปรไฟล์", icon: User },
  ],
  trainer: [
    { to: "/trainer/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
    { to: "/trainer/availability", label: "ตารางว่าง", icon: Calendar },
    { to: "/trainer/bookings", label: "การจอง", icon: CalendarRange },
    { to: "/trainer/chat", label: "แชท", icon: MessageCircle },
    { to: "/trainer/clients", label: "ลูกค้า", icon: Users },
    { to: "/trainer/earnings", label: "รายได้", icon: Wallet },
    { to: "/trainer/profile", label: "โปรไฟล์", icon: User },
  ],
  admin: [
    { to: "/admin/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
    { to: "/admin/users", label: "ผู้ใช้", icon: Users },
    { to: "/admin/trainers", label: "เทรนเนอร์", icon: ShieldCheck },
    { to: "/admin/bookings", label: "การจอง", icon: CalendarRange },
    { to: "/admin/analytics", label: "วิเคราะห์ข้อมูล", icon: BarChart3 },
  ],
};

export function AppShell({ children }: { children: ReactNode }) {
  const { role, user, signOut } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const items = role ? navByRole[role] : [];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0 flex flex-col",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-6">
          <Logo />
          <span className="font-display text-lg font-bold tracking-tight">Fitder</span>
        </div>
        <nav className="flex-1 overflow-y-auto flex flex-col gap-1 p-3">
          {items.map((it) => {
            const active = path === it.to;
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                  active
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-sidebar-border p-3 bg-sidebar">
          <div className="mb-2 px-3 py-2 text-xs text-muted-foreground">
            <div className="truncate">{user?.email}</div>
            <div className="mt-1 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
              {role}
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              nav({ to: "/login" });
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur lg:px-8">
          <button
            className="rounded-md p-2 hover:bg-muted lg:hidden"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="hidden font-display text-sm uppercase tracking-widest text-muted-foreground lg:block">
            {role === "trainer" ? "เทรนเนอร์" : role === "client" ? "ลูกค้า" : "ผู้ดูแล"} · Fitder
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-sm text-muted-foreground sm:block">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
            {role === "trainer" && <TrainerInbox userId={user?.id} />}
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function TrainerInbox({ userId }: { userId?: string }) {
  const qc = useQueryClient();
  const [lastSeenBookingsAt, setLastSeenBookingsAt] = useState("");
  const bookingSeenKey = userId ? `trainer-booking-inbox-seen-${userId}` : "";

  useEffect(() => {
    if (!bookingSeenKey || typeof window === "undefined") {
      setLastSeenBookingsAt("");
      return;
    }
    setLastSeenBookingsAt(window.localStorage.getItem(bookingSeenKey) ?? "");
  }, [bookingSeenKey]);

  const { data: inboxItems = [] } = useQuery({
    queryKey: ["trainer-inbox", userId, lastSeenBookingsAt],
    queryFn: async () => {
      const { data: notifications, error: notificationsError } = await supabase
        .from("notifications")
        .select("id, title, message, is_read, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (notificationsError) throw notificationsError;

      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          "id, client_id, booking_status, created_at, updated_at, slot:availability_slots(date, start_time)",
        )
        .eq("trainer_id", userId!)
        .in("booking_status", ["pending", "accepted"])
        .order("updated_at", { ascending: false })
        .limit(10);
      if (bookingsError) throw bookingsError;

      const clientIds = [...new Set((bookings ?? []).map((booking) => booking.client_id))];
      const { data: profiles } = clientIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", clientIds)
        : { data: [] };
      const clientNames = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile.full_name]),
      );

      const bookingItems = (bookings ?? []).map((booking) => {
        const slot = Array.isArray(booking.slot) ? booking.slot[0] : booking.slot;
        const isAutoConfirmed = booking.booking_status === "accepted";
        const statusText = isAutoConfirmed ? "ยืนยันอัตโนมัติแล้ว" : "รออนุมัติ";
        const activityAt = booking.updated_at ?? booking.created_at;
        const slotText =
          slot?.date && slot?.start_time
            ? ` วันที่ ${new Date(slot.date).toLocaleDateString("th-TH", {
                month: "short",
                day: "numeric",
              })} เวลา ${slot.start_time.slice(0, 5)}`
            : "";

        return {
          id: `booking-${booking.id}`,
          source: "booking" as const,
          title: "มีการจองใหม่",
          message: `${clientNames.get(booking.client_id) ?? "ลูกค้า"} จองเซสชัน${slotText} · ${statusText}`,
          is_read: lastSeenBookingsAt ? activityAt <= lastSeenBookingsAt : false,
          created_at: activityAt,
        };
      });

      const notificationItems = (notifications ?? []).map((notification) => ({
        ...notification,
        source: "notification" as const,
      }));

      return [...notificationItems, ...bookingItems]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`trainer-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["trainer-inbox", userId] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`trainer-bookings-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
          filter: `trainer_id=eq.${userId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["trainer-inbox", userId] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, userId]);

  const unreadCount = inboxItems.filter((item) => !item.is_read).length;

  const markAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    const now = new Date().toISOString();
    if (bookingSeenKey && typeof window !== "undefined") {
      window.localStorage.setItem(bookingSeenKey, now);
      setLastSeenBookingsAt(now);
    }
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (!error) qc.invalidateQueries({ queryKey: ["trainer-inbox", userId] });
  };

  const markRead = async (item: TrainerInboxItem) => {
    if (item.is_read) return;
    if (item.source === "booking") {
      const now = new Date().toISOString();
      if (bookingSeenKey && typeof window !== "undefined") {
        window.localStorage.setItem(bookingSeenKey, now);
        setLastSeenBookingsAt(now);
      }
      return;
    }
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", item.id);
    if (!error) qc.invalidateQueries({ queryKey: ["trainer-inbox", userId] });
  };

  const visibleItems = useMemo(
    () =>
      inboxItems.filter(
        (item, index, items) =>
          item.source === "booking" ||
          !items.some(
            (other) =>
              other.source === "booking" &&
              other.title === item.title &&
              Math.abs(new Date(other.created_at).getTime() - new Date(item.created_at).getTime()) <
                5000,
          ),
      ),
    [inboxItems],
  );

  return (
    <DropdownMenu onOpenChange={(open) => open && markAllRead()}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-card-foreground transition hover:border-primary hover:text-primary"
          aria-label="กล่องข้อความเทรนเนอร์"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
          <span>กล่องข้อความ</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              ใหม่ {unreadCount} รายการ
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {visibleItems.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            ยังไม่มีคำขอจอง
          </div>
        ) : (
          visibleItems.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onSelect={() => markRead(item)}
              className="block cursor-pointer rounded-none px-4 py-3 focus:bg-muted"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    item.is_read ? "bg-muted" : "bg-primary",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{item.title}</div>
                  {item.message && (
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.message}
                    </div>
                  )}
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {new Date(item.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem
          asChild
          className="cursor-pointer justify-center rounded-none px-4 py-3 text-sm font-semibold text-primary"
        >
          <Link to="/trainer/bookings">ดูการจอง</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
