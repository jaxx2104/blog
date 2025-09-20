import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PostEditor } from "@/components/post-editor";
import Link from "next/link";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: post, error } = await supabase
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
    .eq("id", id)
    .single();

  if (error || !post) {
    notFound();
  }

  const { data: { user } } = await supabase.auth.getUser();
  const isAuthor = user?.id === post.author_id;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{post.title}</CardTitle>
          <CardDescription>
            {formatDistanceToNow(new Date(post.created_at), {
              addSuffix: true,
              locale: ja,
            })}
            {post.updated_at !== post.created_at && (
              <span className="ml-2">
                (更新: {formatDistanceToNow(new Date(post.updated_at), {
                  addSuffix: true,
                  locale: ja,
                })})
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAuthor ? (
            <PostEditor post={post} />
          ) : (
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap" style={{ lineHeight: '1.6' }}>
                {post.content.split(/(#[^\s#]+)/).map((part, index) => {
                  if (part.startsWith("#")) {
                    const tagName = part.slice(1);
                    return (
                      <Link
                        key={index}
                        href={`/hashtags/${tagName}`}
                        className="text-blue-600 hover:underline"
                      >
                        {part}
                      </Link>
                    );
                  }
                  return part;
                })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}