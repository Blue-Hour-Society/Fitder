import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Calendar, Loader2, MessageCircle, Send, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { fetchRankedTrainers } from "@/lib/trainers";
import { cn } from "@/lib/utils";

type ChatRoom = {
  id: string;
  client_id: string;
  trainer_id: string;
  created_at: string;
  updated_at: string;
};

type ChatMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type Person = {
  id: string;
  full_name: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

type RoomSummary = ChatRoom & {
  person: Person;
  hasSession: boolean;
};

type TrainerMatch = {
  user_id: string;
  full_name: string | null;
  match: {
    score: number;
  };
};

type BookingAccess = {
  client_id: string;
  trainer_id: string;
  booking_status: string;
};

type DbError = {
  message: string;
  code?: string;
};

type DbResult<T> = {
  data: T | null;
  error: DbError | null;
};

type DynamicQuery<T = unknown> = PromiseLike<DbResult<T>> & {
  select: (columns?: string) => DynamicQuery<T>;
  eq: (column: string, value: unknown) => DynamicQuery<T>;
  in: (column: string, values: unknown[]) => DynamicQuery<T>;
  order: (column: string, options?: { ascending?: boolean }) => DynamicQuery<T>;
  limit: (count: number) => DynamicQuery<T>;
  insert: (values: unknown) => DynamicQuery<T>;
  update: (values: unknown) => DynamicQuery<T>;
  upsert: (values: unknown, options?: { onConflict?: string }) => DynamicQuery<T>;
  maybeSingle: () => Promise<DbResult<T>>;
};

type DynamicSupabase = {
  from: <T = unknown>(table: string) => DynamicQuery<T>;
};

const db = supabase as unknown as DynamicSupabase;

export function ChatPage({ role }: { role: Extract<AppRole, "client" | "trainer"> }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const isClient = role === "client";

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["chat-rooms", role, user?.id],
    queryFn: async () => {
      const column = isClient ? "client_id" : "trainer_id";
      const otherColumn = isClient ? "trainer_id" : "client_id";
      const { data: roomRows, error } = await db
        .from<ChatRoom[]>("chat_rooms")
        .select("id, client_id, trainer_id, created_at, updated_at")
        .eq(column, user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      const ids = [...new Set((roomRows ?? []).map((room: ChatRoom) => room[otherColumn]))];
      const { data: bookings } = await db
        .from<BookingAccess[]>("bookings")
        .select("client_id, trainer_id, booking_status")
        .eq(column, user!.id)
        .in("booking_status", ["pending", "accepted"]);
      const sessionPairs = new Set(
        (bookings ?? []).map((booking) => `${booking.client_id}:${booking.trainer_id}`),
      );
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", ids)
        : { data: [] };
      const people = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

      return (roomRows ?? [])
        .map((room: ChatRoom) => ({
          ...room,
          hasSession: sessionPairs.has(`${room.client_id}:${room.trainer_id}`),
          person: people.get(room[otherColumn]) ?? {
            id: room[otherColumn],
            full_name: isClient ? "Trainer" : "Client",
          },
        }))
        .filter((room: RoomSummary) => room.hasSession) as RoomSummary[];
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["chat-client-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user && isClient,
  });

  const { data: matchedTrainers = [], isLoading: matchesLoading } = useQuery({
    queryKey: ["chat-matched-trainers", profile?.id, profile?.fitness_goal],
    queryFn: async () => {
      const ranked = await fetchRankedTrainers({
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
      });
      return ranked.filter((trainer) => trainer.match.score >= 60).slice(0, 8) as TrainerMatch[];
    },
    enabled: !!profile && isClient,
  });

  const { data: bookedTrainerIds = [] } = useQuery({
    queryKey: ["chat-booked-trainers", user?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from<BookingAccess[]>("bookings")
        .select("client_id, trainer_id, booking_status")
        .eq("client_id", user!.id)
        .in("booking_status", ["pending", "accepted"]);
      if (error) throw error;
      return [...new Set((data ?? []).map((booking) => booking.trainer_id))];
    },
    enabled: !!user && isClient,
  });

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) ?? rooms[0],
    [activeRoomId, rooms],
  );

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["chat-messages", activeRoom?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from<ChatMessage[]>("chat_messages")
        .select("id, room_id, sender_id, body, created_at")
        .eq("room_id", activeRoom!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
    enabled: !!activeRoom?.id,
  });

  useEffect(() => {
    if (!activeRoom?.id) return;

    const channel = supabase
      .channel(`chat-room-${activeRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${activeRoom.id}`,
        },
        () => qc.invalidateQueries({ queryKey: ["chat-messages", activeRoom.id] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoom?.id, qc]);

  const startChat = async (trainerId: string) => {
    if (!user) return;

    const { data: sessionRows, error: sessionError } = await db
      .from<BookingAccess[]>("bookings")
      .select("client_id, trainer_id, booking_status")
      .eq("client_id", user.id)
      .eq("trainer_id", trainerId)
      .in("booking_status", ["pending", "accepted"])
      .limit(1);

    if (sessionError) {
      toast.error(sessionError.message);
      return;
    }
    if (!sessionRows || sessionRows.length === 0) {
      toast.error("Chat is available only while a booked session is pending or accepted.");
      return;
    }

    const { data, error } = await db
      .from<{ id: string }>("chat_rooms")
      .upsert(
        {
          client_id: user.id,
          trainer_id: trainerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id,trainer_id" },
      )
      .select("id")
      .maybeSingle();

    if (error) {
      toast.error(error.message);
      return;
    }

    await qc.invalidateQueries({ queryKey: ["chat-rooms", role, user.id] });
    setActiveRoomId(data?.id ?? null);
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !activeRoom?.id || !draft.trim()) return;
    if (!activeRoom.hasSession) {
      toast.error("This chat is locked because the session is complete or cancelled.");
      return;
    }

    const body = draft.trim();
    setDraft("");

    const { error } = await db.from("chat_messages").insert({
      room_id: activeRoom.id,
      sender_id: user.id,
      body,
    });

    if (error) {
      toast.error(error.message);
      setDraft(body);
      return;
    }

    await db
      .from("chat_rooms")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", activeRoom.id);
    qc.invalidateQueries({ queryKey: ["chat-messages", activeRoom.id] });
    qc.invalidateQueries({ queryKey: ["chat-rooms", role, user.id] });
  };

  const availableMatches = isClient
    ? matchedTrainers.filter(
        (trainer) =>
          bookedTrainerIds.includes(trainer.user_id) &&
          !rooms.some((room) => room.trainer_id === trainer.user_id),
      )
    : [];
  const lockedMatches = isClient
    ? matchedTrainers.filter((trainer) => !bookedTrainerIds.includes(trainer.user_id))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold">Chat</h1>
        <p className="mt-2 text-muted-foreground">
          {isClient
            ? "Chat is available while a matched trainer session is pending or accepted."
            : "Reply to matched clients while their session is pending or accepted."}
        </p>
      </div>

      <div className="grid min-h-[640px] overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-border bg-surface/60 lg:border-b-0 lg:border-r">
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-2 font-display text-lg font-semibold">
              <MessageCircle className="h-5 w-5 text-primary" />
              Conversations
            </div>
          </div>

          <div className="max-h-[560px] overflow-y-auto p-3">
            {roomsLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : rooms.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                {isClient
                  ? "No active chats yet. Book a matched trainer session below."
                  : "No active client chats yet."}
              </div>
            ) : (
              <div className="space-y-2">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setActiveRoomId(room.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border border-transparent p-3 text-left transition hover:border-primary/40 hover:bg-muted",
                      activeRoom?.id === room.id && "border-primary/50 bg-primary/10",
                    )}
                  >
                    <AvatarLabel name={room.person.full_name} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">
                        {room.person.full_name ?? (isClient ? "Trainer" : "Client")}
                      </div>
                      {room.person.email && (
                        <div className="truncate text-xs text-muted-foreground">
                          {room.person.email}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {isClient && (
              <div className="mt-5">
                <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Matched trainers
                </div>
                {matchesLoading ? (
                  <div className="flex h-20 items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                ) : availableMatches.length === 0 && lockedMatches.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                    No matched trainers yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableMatches.map((trainer) => (
                      <button
                        key={trainer.user_id}
                        onClick={() => startChat(trainer.user_id)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left transition hover:border-primary hover:bg-muted"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold">
                            {trainer.full_name ?? "Trainer"}
                          </div>
                          <div className="text-xs text-primary">{trainer.match.score}% match</div>
                        </div>
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                    {lockedMatches.map((trainer) => (
                      <Link
                        key={trainer.user_id}
                        to="/client/trainer/$id"
                        params={{ id: trainer.user_id }}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left transition hover:border-primary hover:bg-muted"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold">
                            {trainer.full_name ?? "Trainer"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Book an active session to unlock chat
                          </div>
                        </div>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-[640px] flex-col">
          {activeRoom ? (
            <>
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <AvatarLabel name={activeRoom.person.full_name} />
                  <div className="min-w-0">
                    <div className="truncate font-display text-lg font-semibold">
                      {activeRoom.person.full_name ?? (isClient ? "Trainer" : "Client")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isClient ? "Matched trainer" : "Client chat"}
                    </div>
                  </div>
                </div>
                {isClient && (
                  <Link
                    to="/client/trainer/$id"
                    params={{ id: activeRoom.trainer_id }}
                    className="rounded-md border border-border px-3 py-2 text-sm hover:border-primary hover:text-primary"
                  >
                    Profile
                  </Link>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {messagesLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                    Send the first message to start the conversation.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const mine = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={cn("flex", mine ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[78%] rounded-xl px-4 py-3 text-sm",
                              mine
                                ? "bg-primary text-primary-foreground"
                                : "bg-surface-elevated text-foreground",
                            )}
                          >
                            <div className="whitespace-pre-wrap break-words">{message.body}</div>
                            <div
                              className={cn(
                                "mt-1 text-[10px]",
                                mine ? "text-primary-foreground/70" : "text-muted-foreground",
                              )}
                            >
                              {new Date(message.created_at).toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <form onSubmit={sendMessage} className="border-t border-border p-4">
                <div className="flex gap-2">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Type a message..."
                    rows={1}
                    className="min-h-11 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              {isClient
                ? "Select a matched trainer to begin chatting."
                : "Client conversations appear while a matched booking is pending or accepted."}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AvatarLabel({ name }: { name: string | null }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
      {name?.[0]?.toUpperCase() ?? <UserRound className="h-5 w-5" />}
    </div>
  );
}
