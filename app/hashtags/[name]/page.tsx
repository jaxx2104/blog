import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HashtagPage({ params }: { params: { name: string } }) {
  const supabase = await createClient();
  const hashtagName = decodeURIComponent(params.name);

  // ハッシュタグを取得
  const { data: hashtag } = await supabase
    .from("hashtags")
    .select("*")
    .eq("name", hashtagName)
    .single();

  if (!hashtag) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">#{hashtagName}</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              このハッシュタグの記事はまだありません
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      {!posts || posts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              このハッシュタグの記事はまだありません
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <Link href={`/${post.id}`}>
                  <CardTitle className="hover:underline cursor-pointer">
                    {post.title}
                  </CardTitle>
                </Link>
                <CardDescription>
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: ja,
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground line-clamp-3">
                  {post.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}