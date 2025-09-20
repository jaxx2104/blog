import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // "next"パラメータがあれば、それをリダイレクトURLとして使用
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) {
    // 相対URLでない場合はデフォルトを使用
    next = "/";
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        // 開発環境では、ロードバランサーがないので直接リダイレクト
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        // 本番環境でロードバランサー経由の場合
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // エラーページにリダイレクト
  return NextResponse.redirect(`${origin}/auth/error`);
}