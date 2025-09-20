"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { $getRoot, $getSelection, EditorState } from "lexical";
import { $generateHtmlFromNodes } from "@lexical/html";
import {
  InitialConfigType,
  LexicalComposer,
} from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { HashtagPlugin } from "@lexical/react/LexicalHashtagPlugin";
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { HashtagNode } from "@lexical/hashtag";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { CodeNode } from "@lexical/code";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS
} from "@lexical/markdown";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";

interface PostEditorProps {
  post?: {
    id: string;
    title: string;
    content: string;
    author_id: string;
  };
  isNew?: boolean;
}

const URL_REGEX = /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/;

const MATCHERS = [
  (text: string) => {
    const match = URL_REGEX.exec(text);
    if (match === null) {
      return null;
    }
    const fullMatch = match[0];
    return {
      index: match.index,
      length: fullMatch.length,
      text: fullMatch,
      url: fullMatch.startsWith("http") ? fullMatch : `https://${fullMatch}`,
    };
  },
];

export function PostEditor({ post, isNew = false }: PostEditorProps) {
  const [title, setTitle] = useState(post?.title || "");
  const [content, setContent] = useState(post?.content || "");
  const [isSaving, setIsSaving] = useState(false);
  const [postId, setPostId] = useState(post?.id || null);
  const router = useRouter();
  const supabase = createClient();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const theme = {
    hashtag: "text-blue-600 hover:underline cursor-pointer",
    link: "text-blue-600 hover:underline cursor-pointer",
    text: {
      bold: "font-bold",
      italic: "italic",
      underline: "underline",
      strikethrough: "line-through",
      code: "bg-gray-100 text-red-600 px-1 rounded font-mono text-sm",
    },
    code: "block bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto",
    codeHighlight: {
      atrule: "text-purple-400",
      attr: "text-green-400",
      boolean: "text-orange-400",
      builtin: "text-cyan-400",
      cdata: "text-gray-500",
      char: "text-green-400",
      class: "text-yellow-400",
      "class-name": "text-yellow-400",
      comment: "text-gray-500 italic",
      constant: "text-orange-400",
      deleted: "text-red-400",
      doctype: "text-gray-500",
      entity: "text-red-400",
      function: "text-blue-400",
      important: "text-red-400",
      inserted: "text-green-400",
      keyword: "text-purple-400",
      namespace: "text-red-400",
      number: "text-orange-400",
      operator: "text-cyan-400",
      prolog: "text-gray-500",
      property: "text-orange-400",
      punctuation: "text-gray-400",
      regex: "text-red-400",
      selector: "text-green-400",
      string: "text-green-400",
      symbol: "text-orange-400",
      tag: "text-pink-400",
      url: "text-cyan-400",
      variable: "text-red-400",
    },
    list: {
      nested: {
        listitem: "ml-6",
      },
      ol: "list-decimal list-inside",
      ul: "list-disc list-inside",
      listitem: "ml-2",
    },
    heading: {
      h1: "text-3xl font-bold mt-6 mb-4",
      h2: "text-2xl font-bold mt-5 mb-3",
      h3: "text-xl font-bold mt-4 mb-2",
      h4: "text-lg font-bold mt-3 mb-2",
      h5: "text-base font-bold mt-2 mb-1",
      h6: "text-sm font-bold mt-2 mb-1",
    },
    quote: "border-l-4 border-gray-300 pl-4 italic my-4 text-gray-700",
  };

  const initialConfig: InitialConfigType = {
    namespace: "PostEditor",
    theme,
    nodes: [
      HashtagNode,
      LinkNode,
      AutoLinkNode,
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
    ],
    onError: (error) => {
      console.error("Lexical error:", error);
    },
    editorState: () => $convertFromMarkdownString(content, TRANSFORMERS),
  };

  const extractHashtags = (text: string): string[] => {
    const regex = /#([^\s#]+)/g;
    const matches = text.match(regex);
    if (!matches) return [];
    return [...new Set(matches.map((tag) => tag.slice(1)))];
  };

  const autoSave = async (newTitle: string, newContent: string) => {
    if (!newTitle.trim() || !newContent.trim()) return;

    setIsSaving(true);

    try {
      if (isNew && !postId) {
        // 新規作成
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("ログインが必要です");

        const { data: newPost, error: createError } = await supabase
          .from("posts")
          .insert({
            title: newTitle,
            content: newContent,
            author_id: user.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        setPostId(newPost.id);

        // 新規作成後は詳細ページにリダイレクト
        router.push(`/${newPost.id}`);
        return;
      } else if (postId) {
        // 既存記事を更新
        const { error: updateError } = await supabase
          .from("posts")
          .update({
            title: newTitle,
            content: newContent,
            updated_at: new Date().toISOString()
          })
          .eq("id", postId);

        if (updateError) throw updateError;
      }

      // ハッシュタグを更新（記事IDがある場合のみ）
      if (postId) {
        const hashtags = extractHashtags(newContent);

        // 既存の関連を削除
        await supabase.from("post_hashtags").delete().eq("post_id", postId);

        // 新しいハッシュタグを処理
        for (const tagName of hashtags) {
          let { data: hashtag } = await supabase
            .from("hashtags")
            .select()
            .eq("name", tagName)
            .single();

          if (!hashtag) {
            const { data: newHashtag } = await supabase
              .from("hashtags")
              .insert({ name: tagName })
              .select()
              .single();
            hashtag = newHashtag;
          }

          if (hashtag) {
            await supabase.from("post_hashtags").insert({
              post_id: postId,
              hashtag_id: hashtag.id,
            });
          }
        }
      }
    } catch (error) {
      console.error("Auto-save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!postId || !confirm("この記事を削除しますか？")) return;

    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
      router.push("/");
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      // マークダウン形式で保存
      const markdown = $convertToMarkdownString(TRANSFORMERS);
      setContent(markdown);

      // 既存のタイマーをキャンセル
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // 1秒後に自動保存
      saveTimeoutRef.current = setTimeout(() => {
        autoSave(title, markdown);
      }, 1000);
    });
  };

  // コンポーネントのアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <div className="mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            // タイトル変更時も自動保存
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
            }
            saveTimeoutRef.current = setTimeout(() => {
              autoSave(e.target.value, content);
            }, 1000);
          }}
          placeholder="タイトルを入力"
          className="text-3xl font-bold w-full border-0 outline-none focus:outline-none bg-transparent"
        />
      </div>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="relative group">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="outline-none min-h-[200px] focus:outline-none transition-all"
                style={{
                  padding: '0',
                  lineHeight: '1.6',
                }}
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <OnChangePlugin onChange={onChange} />
          <HashtagPlugin />
          <AutoLinkPlugin matchers={MATCHERS} />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <ListPlugin />
        </div>

        {/* 保存状態のインジケーター */}
        {isSaving && (
          <div className="absolute top-0 right-0 text-xs text-gray-400">
            保存中...
          </div>
        )}

        {/* 削除ボタンは既存記事の場合のみ表示 */}
        {!isNew && postId && (
          <div className="mt-12 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-red-600"
              onClick={handleDelete}
            >
              記事を削除
            </Button>
          </div>
        )}
      </LexicalComposer>
    </div>
  );
}