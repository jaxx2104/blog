"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Post } from "@/lib/types/post";
import { CONTENT_PREVIEW_LENGTH } from "@/lib/constants/ui";
import { PostTimestamp } from "./post-timestamp";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const contentPreview = 
    post.content.length > CONTENT_PREVIEW_LENGTH 
      ? `${post.content.slice(0, CONTENT_PREVIEW_LENGTH)}...` 
      : post.content;

  return (
    <Link href={`/${post.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <CardDescription>
            <PostTimestamp createdAt={post.created_at} updatedAt={post.updated_at} />
          </CardDescription>
          <CardTitle>{post.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p 
            className="text-muted-foreground whitespace-pre-wrap" 
          >
            {contentPreview}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}