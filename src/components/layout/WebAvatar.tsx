import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";

const WEBAVATAR_SDK_ID = "webavatar-jssdk";
const WEBAVATAR_SDK_SRC = "https://webavatar.didthat.cc/chat-widget.js";

declare global {
  interface Window {
    ChatWidgetConfig?: {
      mode: string;
      widgetId: string;
      avatarUrl: string;
      greetingInstruction?: string;
      enableBubble?: string;
      cameraOffset?: string;
      container?: HTMLElement | string;
    };
    WebAvatar?: {
      disconnect: () => void;
    };
  }
}

interface WebAvatarProps {
  className?: string;
}

export function WebAvatar({ className }: WebAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    window.ChatWidgetConfig = {
      mode: "realtime-fullscreen",
      widgetId: "Botnoi-Fitder",
      avatarUrl: "Volley",
      greetingInstruction: "",
      enableBubble: "true",
      cameraOffset: "0,0,0",
      container,
    };

    if (!document.getElementById(WEBAVATAR_SDK_ID)) {
      const script = document.createElement("script");
      script.id = WEBAVATAR_SDK_ID;
      script.src = WEBAVATAR_SDK_SRC;
      script.async = true;
      (document.head || document.body).appendChild(script);
    }

    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ target: string }>;
      customEvent.preventDefault();
      navigate({ to: customEvent.detail.target });
    };
    window.addEventListener("webavatar-navigate", handleNavigate);

    return () => {
      window.removeEventListener("webavatar-navigate", handleNavigate);
      try {
        window.WebAvatar?.disconnect();
      } catch {}
    };
  }, [navigate]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", position: "relative" }}
    />
  );
}
