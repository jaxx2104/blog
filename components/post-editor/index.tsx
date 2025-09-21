"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditorState } from "lexical";
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
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS
} from "@lexical/markdown";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { Post } from "@/lib/types/post";
import { TitleInput } from "./title-input";
import { useAutoSave } from "./auto-save-manager";
import { editorNodes, editorTheme, MATCHERS } from "./editor-config";
import { POST_MESSAGES } from "@/lib/constants/messages";

interface PostEditorProps {
  post: Post | undefined;
  canEdit: boolean;
}

export function PostEditor({ post, canEdit }: PostEditorProps) {
  const [title, setTitle] = useState(post?.title || "");
  const [content, setContent] = useState(post?.content || "");
  const [isSaving, setIsSaving] = useState(false);
  const [postId, setPostId] = useState(post?.id || null);
  const router = useRouter();

  const { scheduleSave } = useAutoSave({
    postId,
    title,
    content,
    onPostCreated: (newPostId) => {
      setPostId(newPostId);
      router.push(`/${newPostId}`);
    },
    onSavingChange: setIsSaving,
  });

  const initialConfig: InitialConfigType = {
    namespace: "PostEditor",
    theme: editorTheme,
    nodes: editorNodes,
    onError: (error) => {
      console.error("Lexical error:", error);
    },
    editorState: () => $convertFromMarkdownString(content, TRANSFORMERS),
    editable: canEdit,
  };

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const markdown = $convertToMarkdownString(TRANSFORMERS);
      setContent(markdown);
      scheduleSave(title, markdown);
    });
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    scheduleSave(newTitle, content);
  };

  return (
    <div className="relative">
      <TitleInput 
        value={title}
        onChange={handleTitleChange}
        readonly={!canEdit}
        placeholder={POST_MESSAGES.TITLE_PLACEHOLDER}
      />
      <LexicalComposer initialConfig={initialConfig}>
        <div className="relative group">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="outline-none min-h-[200px] focus:outline-none transition-all p-0 font-normal text-base leading-6"
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

        {isSaving && (
          <div className="absolute top-0 right-0 text-xs text-gray-400">
            {POST_MESSAGES.SAVING}
          </div>
        )}
      </LexicalComposer>
    </div>
  );
}