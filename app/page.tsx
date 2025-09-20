import { createClient } from "@/lib/supabase/server";
import { PostList } from "@/components/post-list";
import { Post } from "@/lib/types/post";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: posts, error } = await supabase
    .from("posts")
    .select(`
      *,
      post_hashtags (
        hashtag_id,
        hashtags (
          id,
          name
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching posts:", error);
    return <div className="container mx-auto py-8">記事の取得に失敗しました</div>;
  }

  await supabase.auth.getUser();

  return (
    <div className="container mx-auto py-8">
      <PostList posts={posts as Post[]} />
    </div>
  );
}
