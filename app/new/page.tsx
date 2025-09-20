import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PostEditor } from "@/components/post-editor";

export default async function NewPostPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const isAuthor = !!user?.id

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardContent className="pt-6">
          <PostEditor post={undefined} canEdit={isAuthor} />
        </CardContent>
      </Card>
    </div>
  );
}