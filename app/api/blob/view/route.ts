import { NextResponse } from "next/server";
import { get } from "@vercel/blob";

/**
 * Proxies a private Vercel Blob so it can be used as a plain <img src>.
 * The store is private (no public-access toggle was available when it was
 * created), so the client can never load blob URLs directly — this route
 * fetches the content server-side, with the store's token, and streams it
 * back. Not permission-gated: these are reference photos, not sensitive data.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  try {
    const result = await get(url, { access: "private" });
    if (!result || result.statusCode !== 200) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not load image" }, { status: 500 });
  }
}
