import { useEffect } from "react";

const BOTNOI_SDK_ID = "bn-jssdk";
const BOTNOI_SDK_SRC = "https://console.botnoi.ai/customerchat/index.js";

declare global {
  interface Window {
    BN?: {
      init: (options: { version: string }) => void;
    };
  }
}

const botnoiAttributes = {
  bot_id: "6a02d95ffb3079f0079164d7",
  bot_logo:
    "https://bn-sme-production-ap-southeast-1.s3.amazonaws.com/6a02d95ffb3079f0079164d7/4fd91095-a758-48b5-837c-2f71ae6d774c.png",
  bot_name: "Fitder AI Assistant",
  theme_color: "#d7ff2f",
  locale: "th",
  logged_in_greeting: "สวัสดีครับ ต้องการให้ Fitder ช่วยเรื่องอะไรดี?",
  greeting_message: "คุยกับ Fitder AI ได้เลยครับ",
  default_open: "false",
};

export function ChatBot() {
  useEffect(() => {
    const initBotnoi = () => window.BN?.init({ version: "1.0" });
    const existingScript = document.getElementById(BOTNOI_SDK_ID) as HTMLScriptElement | null;

    if (existingScript) {
      initBotnoi();
      return;
    }

    const firstScript = document.getElementsByTagName("script")[0];
    const script = document.createElement("script");
    script.id = BOTNOI_SDK_ID;
    script.src = BOTNOI_SDK_SRC;
    script.async = true;
    script.onload = initBotnoi;

    firstScript.parentNode?.insertBefore(script, firstScript);
  }, []);

  return (
    <>
      <div id="bn-root" />
      <div className="bn-customerchat" {...botnoiAttributes} />
    </>
  );
}
