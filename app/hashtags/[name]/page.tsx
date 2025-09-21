import { createClient } from "@/lib/supabase/server";
import { PostList } from "@/components/post-list";
import { Post } from "@/lib/types/post";
import { notFound } from "next/navigation";

export default async function HashtagPage({ params }: { params: Promise<{ name: string }> }) {
  const supabase = await createClient();
  const { name } = await params;
  const hashtagName = decodeURIComponent(name);

  // ハッシュタグを取得
  const { data: hashtag, error: hashtagError } = await supabase
    .from("hashtags")
    .select("*")
    .eq("name", hashtagName)
    .single();

  if (hashtagError || !hashtag) {
    notFound();
  }

  // ハッシュタグに関連する記事を取得
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select(`
      *,
      post_hashtags!inner (
        hashtag_id
      )
    `)
    .eq("post_hashtags.hashtag_id", hashtag.id)
    .order("created_at", { ascending: false });

  if (postsError) {
    console.error("Error fetching posts:", postsError);
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">#{hashtagName}</h1>
      <PostList 
        posts={posts as Post[] | null} 
        emptyMessage={`#${hashtagName} タグが付いた記事はまだありません`} 
      />
    </div>
  );
}