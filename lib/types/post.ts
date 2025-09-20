export interface Hashtag {
  id: string;
  name: string;
}

export interface PostHashtag {
  hashtag_id: string;
  hashtags: Hashtag;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  post_hashtags?: PostHashtag[];
}