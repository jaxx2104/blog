import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    return <div>記事の取得に失敗しました</div>;
  }

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        {user && (
          <Link href="/new">
            <Button>新規記事作成</Button>
          </Link>
        )}
      </div>

      {!posts || posts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              まだ記事がありません
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
                <div className="text-muted-foreground line-clamp-3">
                  <p className="whitespace-pre-wrap" style={{ lineHeight: '1.6' }}>
                    {post.content.length > 150 ? post.content.slice(0, 150) + "..." : post.content}
                  </p>
                </div>
                {post.post_hashtags && post.post_hashtags.length > 0 && (
                  <div className="flex gap-2 mt-4">
                    {post.post_hashtags.map((ph: any) => (
                      <Link
                        key={ph.hashtag_id}
                        href={`/hashtags/${ph.hashtags.name}`}
                      >
                        <span className="text-sm text-blue-600 hover:underline">
                          #{ph.hashtags.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
