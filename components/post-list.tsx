import { EmptyState } from "@/components/empty-state";
import { Post } from "@/lib/types/post";
import { DEFAULT_EMPTY_MESSAGE } from "@/lib/constants/ui";
import { PostEditor } from "./post-editor";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader } from "./ui/card";
import { PostTimestamp } from "./post-timestamp";

interface PostListProps {
  posts: Post[] | null;
  emptyMessage?: string;
}

export function PostList({
  posts,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
}: PostListProps) {
  if (!posts || posts.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="grid gap-4">
      {posts.map((post) => (
        <Card key={post.id}>
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
            </div>
          </CardHeader>
          <CardContent>
            <Link href={`/${post.id}`}>
              <PostEditor key={post.id} post={post} canEdit={false} />
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
