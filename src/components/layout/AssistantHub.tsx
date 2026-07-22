import { useState, useCallback, useEffect, useRef } from "react";
import { MessageCircle, Mic, X } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { ChatBot } from "@/components/layout/ChatBot";
import { WebAvatar } from "@/components/layout/WebAvatar";
import { cn } from "@/lib/utils";

type HubMode = "idle" | "menu" | "chat" | "avatar";

export function AssistantHub() {
  const [mode, setMode] = useState<HubMode>("idle");
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isChatPage = location.pathname.includes("/chat");

  const toggleMenu = useCallback(() => {
    setMode((prev) => (prev === "menu" ? "idle" : prev === "idle" ? "menu" : "idle"));
  }, []);

  const selectChat = useCallback(() => {
    setMode("chat");
  }, []);

  const selectAvatar = useCallback(() => {
    setMode("avatar");
  }, []);

  const close = useCallback(() => {
    setMode("idle");
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (mode !== "menu") return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMode("idle");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mode]);

  // When chat mode is selected, we render the ChatBot (which injects the Botnoi SDK)
  // and programmatically trigger it to open.
  // When avatar mode is selected, we render WebAvatar.

  if (isChatPage) return null;

  return (
    <>
      {/* Botnoi SDK for Text Chat */}
      <ChatBot active={mode === "chat"} />

      {/* WebAvatar — keep mounted but hide using CSS when not active */}
      <div className={cn("assistant-avatar-overlay", mode !== "avatar" && "hidden")}>
        <button
          onClick={close}
          className="assistant-avatar-close"
          aria-label="ปิด Voice AI"
        >
          <X className="h-4 w-4" />
        </button>
        <WebAvatar className="assistant-avatar-container" />
      </div>

      <div
        className={cn(
          "assistant-hub",
          mode === "chat" && "assistant-hub--chat-active",
        )}
        ref={menuRef}
      >
        {/* Radial menu options */}
        <div
          className={cn(
            "assistant-menu",
            mode === "menu" && "assistant-menu--open",
          )}
        >
          <button
            className="assistant-menu-item"
            onClick={selectChat}
            aria-label="เปิดแชทข้อความ"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="assistant-menu-label">Text Chat</span>
          </button>
          <button
            className="assistant-menu-item"
            onClick={selectAvatar}
            aria-label="เปิด Voice AI"
          >
            <Mic className="h-5 w-5" />
            <span className="assistant-menu-label">Voice AI</span>
          </button>
        </div>

        {/* Main FAB */}
        <button
          className={cn(
            "assistant-fab",
            (mode === "menu" || mode === "chat") && "assistant-fab--active",
          )}
          onClick={mode === "chat" ? close : toggleMenu}
          aria-label={mode === "chat" ? "ปิด Text Chat" : "เปิดเมนูผู้ช่วย AI"}
        >
          {mode === "menu" || mode === "chat" ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
        </button>
      </div>
    </>
  );
}
