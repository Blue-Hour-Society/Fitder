import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ChatPage } from "@/components/chat/ChatPage";

export const Route = createFileRoute("/client/chat")({
  component: () => (
    <RoleGuard role="client">
      <ChatPage role="client" />
    </RoleGuard>
  ),
});
