/** Builds a same-origin URL that proxies a private Vercel Blob for use in a plain <img src>. */
export function blobViewUrl(url: string): string {
  return `/api/blob/view?url=${encodeURIComponent(url)}`;
}
