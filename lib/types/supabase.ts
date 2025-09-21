import { Post, Hashtag, PostHashtag } from "./post";

export interface PostWithHashtags extends Post {
  post_hashtags: Array<{
    hashtag_id: string;
    hashtags: Hashtag;
  }>;
}

export interface HashtagWithPosts extends Hashtag {
  posts: Post[];
}

export type SupabasePost = Omit<Post, 'post_hashtags'> & {
  post_hashtags?: PostHashtag[];
};