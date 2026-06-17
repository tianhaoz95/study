// Detects, at build time, whether a post references a GitHub repo and/or a
// research paper. Signals are read from the post's hero "buttons" (the
// `.hero-btn` anchors that head each post), so casual mentions of github.com
// or arxiv in body copy don't produce false positives.

const _raw = import.meta.glob('../pages/posts/**/index.astro', { as: 'raw', eager: true }) as Record<string, string>;

function heroHrefs(raw: string): string[] {
  const out: string[] = [];
  const re = /class="hero-btn"[^>]*?href="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) out.push(m[1]);
  return out;
}

export interface PostLinks {
  github: boolean;
  paper: boolean;
}

export function postLinks(slug: string): PostLinks {
  const raw = _raw[`../pages/posts/${slug}/index.astro`] ?? '';
  const hrefs = heroHrefs(raw);
  return {
    github: hrefs.some(h => /github\.com/i.test(h)),
    paper: hrefs.some(h => /arxiv\.org/i.test(h)),
  };
}
