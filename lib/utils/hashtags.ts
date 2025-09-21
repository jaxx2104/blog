export function extractHashtags(text: string): string[] {
  const regex = /#([^\s#]+)/g;
  const matches = text.match(regex);
  if (!matches) return [];
  return [...new Set(matches.map((tag) => tag.slice(1)))];
}