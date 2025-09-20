"use client";

import { formatDistanceToNow } from "date-fns";
import { DATE_LOCALE } from "@/lib/constants/ui";

interface PostTimestampProps {
  createdAt: string;
  updatedAt: string;
}

export function PostTimestamp({ createdAt, updatedAt }: PostTimestampProps) {
  return (
    <>
      {formatDistanceToNow(new Date(createdAt), {
        addSuffix: true,
        locale: DATE_LOCALE,
      })}
      {updatedAt !== createdAt && (
        <span className="ml-2">
          (更新: {formatDistanceToNow(new Date(updatedAt), {
            addSuffix: true,
            locale: DATE_LOCALE,
          })})
        </span>
      )}
    </>
  );
}