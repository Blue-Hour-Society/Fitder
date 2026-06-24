import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
}

export function Logo({ className, iconClassName }: LogoProps) {
  // หากคุณมีไฟล์โลโก้แล้ว ให้เปลี่ยนจาก <Dumbbell /> เป็น <img src="/logo.png" /> หรือนำเข้าจาก assets
  // ตัวอย่าง: import logoImg from "@/assets/logo.png";
  
  const hasLogoFile = true; // เปลี่ยนเป็น true เมื่อคุณอัปโหลดไฟล์โลโก้แล้ว

  return (
    <div className={cn("flex h-8 w-8 items-center justify-center rounded-md bg-primary", className)}>
      {hasLogoFile ? (
        <img src="/logo.png" alt="Fitder Logo" className={cn("h-6 w-6 object-contain", iconClassName)} />
      ) : (
        <Dumbbell className={cn("h-4 w-4 text-primary-foreground", iconClassName)} />
      )}
    </div>
  );
}
