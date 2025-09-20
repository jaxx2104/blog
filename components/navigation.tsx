"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

export function Navigation() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            Blog
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link href="/new">
                  <Button variant="outline">新規作成</Button>
                </Link>
                <Button onClick={handleSignOut} variant="ghost">
                  ログアウト
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/sign-up">
                  <Button>サインアップ</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}