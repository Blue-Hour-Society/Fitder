import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Gift, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DailyReward() {
  const { user } = useAuth();
  const [showReward, setShowReward] = useState(false);
  const [rewardData, setRewardData] = useState<{
    streak: number;
    points_awarded: number;
    is_bonus: boolean;
  } | null>(null);

  useEffect(() => {
    if (user) {
      checkDailyLogin();
    }
  }, [user]);

  const checkDailyLogin = async () => {
    try {
      const { data, error } = await supabase.rpc("record_daily_login", {
        p_user_id: user?.id,
      });

      if (error) throw error;

      const result = data as any;
      if (result.status === "success") {
        setRewardData({
          streak: result.streak,
          points_awarded: result.points_awarded,
          is_bonus: result.is_bonus,
        });
        setShowReward(true);
        toast.success(`You earned ${result.points_awarded} reward points!`);
      }
    } catch (error) {
      console.error("Error checking daily login:", error);
    }
  };

  if (!rewardData) return null;

  return (
    <Dialog open={showReward} onOpenChange={setShowReward}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <Gift className="w-12 h-12 text-primary animate-bounce" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold">Daily Reward!</DialogTitle>
          <DialogDescription className="text-lg mt-2">
            Welcome back! You've claimed your daily login reward.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6">
          <div className="flex items-center justify-center gap-2 text-3xl font-bold text-primary">
            <Sparkles className="w-8 h-8" />
            <span>+{rewardData.points_awarded} Points</span>
          </div>
          <p className="text-muted-foreground mt-2">
            Current Streak: <span className="font-semibold text-foreground">{rewardData.streak} days</span>
          </p>
          {rewardData.is_bonus && (
            <p className="text-sm text-green-600 font-medium mt-1">
              🎉 Streak Bonus Included!
            </p>
          )}
        </div>
        <DialogFooter className="sm:justify-center">
          <Button onClick={() => setShowReward(false)} className="px-8">
            Great!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
