export async function POST() {
  return Response.json({ error: "Use /api/inventory/import/preview and /api/inventory/import. Legacy placeholder-IMEI imports are disabled." }, { status: 410 });
}
