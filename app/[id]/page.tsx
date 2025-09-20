import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { PostEditor } from "@/components/post-editor";
import { Button } from "@/components/ui/button";
import { PostTimestamp } from "@/components/post-timestamp";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: post, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      post_hashtags (
        hashtag_id,
        hashtags (
          id,
          name
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !post) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthor = !!user?.id

  async function deletePost() {
    "use server";
    const supabase = await createClient();
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (!error) {
      redirect("/");
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <CardDescription>
                <PostTimestamp
                  createdAt={post.created_at}
                  updatedAt={post.updated_at}
                />
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
          <PostEditor post={post} canEdit={isAuthor} />
        </CardContent>
      </Card>
    </div>
  );
}
