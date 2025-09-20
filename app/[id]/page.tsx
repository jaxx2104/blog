import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PostEditor } from "@/components/post-editor";
import { Button } from "@/components/ui/button";
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

  async function deletePost() {
    "use server";
    const supabase = await createClient();
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (!error) {
      redirect("/");
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              {!isAuthor && <CardTitle className="text-3xl">{post.title}</CardTitle>}
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
            </div>
            {isAuthor && (
              <form action={deletePost}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  削除
                </Button>
              </form>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isAuthor ? (
            <PostEditor post={post} />
          ) : (
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap" style={{ lineHeight: '1.6' }}>
                {post.content.split(/(#[^\s#]+)/).map((part: string, index: number) => {
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