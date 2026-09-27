import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function SaveButton({ type, id, className }: { type: "problem" | "idea"; id: string; className?: string }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabase
      .from("saved_items")
      .select("id")
      .eq("item_type", type)
      .eq("item_id", id)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, type, id]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return toast("Sign in to save items to your profile.");
    if (saved) {
      await supabase.from("saved_items").delete().eq("item_type", type).eq("item_id", id);
      setSaved(false);
    } else {
      const { error } = await supabase.from("saved_items").insert({ item_type: type, item_id: id });
      if (error) return toast.error("Couldn't save. Please try again.");
      setSaved(true);
      toast.success("Saved to your profile");
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={saved ? "Remove from saved" : "Save"}
      className={cn("grid h-9 w-9 place-items-center rounded-full hover:bg-secondary", saved && "text-signal", className)}
    >
      {saved ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
    </button>
  );
}
