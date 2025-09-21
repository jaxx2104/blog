export const ERROR_MESSAGES = {
  GENERAL: "エラーが発生しました",
  LOGIN_REQUIRED: "ログインが必要です",
  POST_FETCH_FAILED: "記事の取得に失敗しました",
  POST_NOT_FOUND: "記事が見つかりませんでした",
  HASHTAG_NOT_FOUND: "ハッシュタグが見つかりませんでした",
} as const;

export const AUTH_MESSAGES = {
  LOGGING_IN: "ログイン中...",
  LOGIN_WITH_GOOGLE: "Googleでログイン",
  SIGNING_UP: "登録中...",
  SIGNUP_WITH_GOOGLE: "Googleでサインアップ",
} as const;

export const POST_MESSAGES = {
  SAVING: "保存中...",
  DELETE: "削除",
  CREATE_NEW: "新規作成",
  TITLE_PLACEHOLDER: "タイトルを入力...",
} as const;

export const UI_MESSAGES = {
  LOGOUT: "ログアウト",
  ALREADY_HAVE_ACCOUNT: "すでにアカウントをお持ちの場合",
  LOGIN: "ログイン",
  SIGNUP: "サインアップ",
  LOGIN_DESCRIPTION: "Googleアカウントでログインしてください",
  SIGNUP_DESCRIPTION: "Googleアカウントで新規登録してください",
} as const;