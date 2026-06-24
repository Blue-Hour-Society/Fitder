import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ChatPage } from "@/components/chat/ChatPage";

export const Route = createFileRoute("/trainer/chat")({
  component: () => (
    <RoleGuard role="trainer">
      <ChatPage role="trainer" />
    </RoleGuard>
  ),
});
