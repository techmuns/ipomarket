// Shared SEBI public-issues HTML → PDF URL extractor.
//
// Lifted verbatim from scripts/probes/P-08-sebi-publicissues.ts (Phase 0)
// so that both P-08 and the Phase 5A.1 discovery helper
// (scripts/pdf/discover.ts) can parse the same SEBI listing HTML shape
// without duplicating regex logic. No semantic change vs the original.

export interface DiscoveredPdf {
  url: string;
  link_text: string;
  source: string;
}

export function absolutize(href: string, baseUrl: string): string {
  let h = href.trim();
  if (h.startsWith('//')) return 'https:' + h;
  if (h.startsWith('/')) {
    const u = new URL(baseUrl);
    return `${u.protocol}//${u.host}${h}`;
  }
  if (!/^https?:\/\//i.test(h)) {
    const u = new URL(baseUrl);
    return `${u.protocol}//${u.host}/${h.replace(/^\.?\//, '')}`;
  }
  return h;
}

// Broad PDF scan: finds .pdf URLs anywhere in the body (href, onclick,
// data-* attributes, JSON blobs, JS strings).
export function extractAllPdfs(
  html: string,
  baseUrl: string,
  sourceLabel: string
): DiscoveredPdf[] {
  const out: DiscoveredPdf[] = [];
  const seen = new Set<string>();

  // 1. Anchor PDFs: <a ... href="...pdf">text</a>
  const anchorRe = /<a\s+[^>]*href\s*=\s*["']([^"']*\.pdf(?:[?#][^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html))) {
    const url = absolutize(m[1]!, baseUrl);
    if (seen.has(url)) continue;
    seen.add(url);
    const text = m[2]!
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
    out.push({ url, link_text: text, source: sourceLabel });
  }

  // 2. Any URL ending in .pdf (catches onclick, data attrs, JS).
  const anyPdfRe = /["'\s(=]((?:https?:\/\/|\/)[^"'\s)]+\.pdf(?:[?#][^"'\s)]*)?)["'\s)]/gi;
  while ((m = anyPdfRe.exec(html))) {
    const url = absolutize(m[1]!, baseUrl);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, link_text: '', source: sourceLabel });
  }

  // 3. SEBI attachedfile= pattern (PDF served via internal route).
  const attachedRe = /attachedfile=([^"'&\s]+\.pdf(?:[?#][^"'\s]*)?)/gi;
  while ((m = attachedRe.exec(html))) {
    const url = absolutize(`/sebi_data/attachdocs/${m[1]!}`, baseUrl);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, link_text: '(attachedfile route)', source: sourceLabel });
  }

  return out;
}
