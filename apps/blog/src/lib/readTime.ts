export function calcReadTime(content: string): string {
  const noFrontmatter = content.replace(/^---[\s\S]*?---\n/, '');
  const noBlocks = noFrontmatter
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, '');
  const text = noBlocks.replace(/<[^>]+>/g, ' ');
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `~${mins} min read`;
}
