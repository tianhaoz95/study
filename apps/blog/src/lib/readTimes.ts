import { calcReadTime } from './readTime';

const _raw = import.meta.glob('../pages/posts/**/index.astro', { as: 'raw', eager: true }) as Record<string, string>;

export function postReadTime(slug: string): string {
  return calcReadTime(_raw[`../pages/posts/${slug}/index.astro`] ?? '');
}
