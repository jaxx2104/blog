import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { AUTO_SAVE_DELAY_MS } from "@/lib/constants/ui";
import { ERROR_MESSAGES } from "@/lib/constants/messages";
import { extractHashtags } from "@/lib/utils/hashtags";

interface AutoSaveManagerProps {
  postId: string | null;
  title: string;
  content: string;
  onPostCreated: (postId: string) => void;
  onSavingChange: (isSaving: boolean) => void;
}

export function useAutoSave({ 
  postId, 
  title, 
  content, 
  onPostCreated,
  onSavingChange 
}: AutoSaveManagerProps) {
  const supabase = createClient();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const autoSave = async (newTitle: string, newContent: string) => {
    if (!newTitle.trim() || !newContent.trim()) return;

    onSavingChange(true);

    try {
      if (!postId) {
        // 新規作成
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error(ERROR_MESSAGES.LOGIN_REQUIRED);

        const { data: newPost, error: createError } = await supabase
          .from("posts")
          .insert({
            title: newTitle,
            content: newContent,
            author_id: user.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        onPostCreated(newPost.id);
        return;
      } else {
        // 既存記事を更新
        const { error: updateError } = await supabase
          .from("posts")
          .update({
            title: newTitle,
            content: newContent,
            updated_at: new Date().toISOString()
          })
          .eq("id", postId);

        if (updateError) throw updateError;
      }

      // ハッシュタグを更新
      if (postId) {
        const hashtags = extractHashtags(newContent);

        // 既存の関連を削除
        await supabase.from("post_hashtags").delete().eq("post_id", postId);

        // 新しいハッシュタグを処理
        for (const tagName of hashtags) {
          let { data: hashtag } = await supabase
            .from("hashtags")
            .select()
            .eq("name", tagName)
            .single();

          if (!hashtag) {
            const { data: newHashtag } = await supabase
              .from("hashtags")
              .insert({ name: tagName })
              .select()
              .single();
            hashtag = newHashtag;
          }

          if (hashtag) {
            await supabase.from("post_hashtags").insert({
              post_id: postId,
              hashtag_id: hashtag.id,
            });
          }
        }
      }
    } catch (error) {
      console.error("Auto-save error:", error);
    } finally {
      onSavingChange(false);
    }
  };

  const scheduleSave = (newTitle: string, newContent: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(newTitle, newContent);
    }, AUTO_SAVE_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return { scheduleSave };
}