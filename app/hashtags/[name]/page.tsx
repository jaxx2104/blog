import { createClient } from "@/lib/supabase/server";
import { PostList } from "@/components/post-list";
import { Post } from "@/lib/types/post";

export default async function HashtagPage({ params }: { params: Promise<{ name: string }> }) {
  const supabase = await createClient();
  const { name } = await params;
  const hashtagName = decodeURIComponent(name);

  // ハッシュタグを取得
  const { data: hashtag } = await supabase
    .from("hashtags")
    .select("*")
    .eq("name", hashtagName)
    .single();

  // ハッシュタグに関連する記事を取得
  const { data: posts } = await supabase
    .from("posts")
    .select(`
      *,
      post_hashtags!inner (
        hashtag_id
      )
    `)
    .eq("post_hashtags.hashtag_id", hashtag.id)
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">#{hashtagName}</h1>
      <PostList posts={posts as Post[]} />
    </div>
  );
}