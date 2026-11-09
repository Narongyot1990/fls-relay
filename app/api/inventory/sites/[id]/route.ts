import { manageDirectory } from "@/lib/db/directory-management";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return manageDirectory(request, (await params).id, "sites");
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return manageDirectory(request, (await params).id, "sites");
}
