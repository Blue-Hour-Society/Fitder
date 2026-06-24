import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, User } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AvatarUploadProps {
  url: string | null;
  onUpload: (url: string) => void;
  userId: string;
}

export function AvatarUpload({ url, onUpload, userId }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (url) {
      if (url.startsWith("http")) {
        setAvatarUrl(url);
      } else {
        const { data } = supabase.storage.from("avatars").getPublicUrl(url);
        setAvatarUrl(data.publicUrl);
      }
    }
  }, [url]);

  async function uploadAvatar(event: any) {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      onUpload(filePath);
      toast.success("Avatar uploaded successfully!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className="h-24 w-24 border-2 border-primary/20">
        <AvatarImage src={avatarUrl ?? undefined} />
        <AvatarFallback className="bg-muted">
          <User className="h-12 w-12 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      <div className="relative">
        <input
          type="file"
          id="single"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploading}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <label
          htmlFor="single"
          className={`flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-semibold transition hover:bg-secondary/80 ${
            uploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Uploading..." : "Change photo"}
        </label>
      </div>
    </div>
  );
}
