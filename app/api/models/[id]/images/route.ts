import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { addModelImage, removeModelImage } from "@/lib/db/queries";
import { canManageModels } from "@/lib/permissions";
import type { Level } from "@/types";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * There is no session/auth yet, so the caller's role travels as a header the
 * client sets from its (dev-only) current-user context. This is NOT a real
 * permission check — a client can send any value — it only exists so the
 * server-side gate is already wired in the right shape once real auth lands.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canManageModels(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get("file");
  const description = formData.get("description");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "An image file is required" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 8MB)" }, { status: 400 });
  }
  if (typeof description !== "string" || !description.trim()) {
    return NextResponse.json({ error: "A description is required" }, { status: 400 });
  }

  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const pathname = `models/${id}/${Date.now()}-${crypto.randomUUID()}${ext}`;

  try {
    // The store has no public-access option (newly created Blob stores are
    // private-only), so uploads go in private and are served back through
    // /api/blob/view, which fetches with the server's token.
    const blob = await put(pathname, file, { access: "private" });
    const model = await addModelImage(id, { url: blob.url, description: description.trim() });
    if (!model) return NextResponse.json({ error: "Model not found" }, { status: 404 });
    return NextResponse.json({ model }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not upload image" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canManageModels(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  await del(url).catch(() => {
    // Already gone from the blob store — still remove the reference below.
  });
  const model = await removeModelImage(id, url);
  if (!model) return NextResponse.json({ error: "Model not found" }, { status: 404 });
  return NextResponse.json({ model });
}
