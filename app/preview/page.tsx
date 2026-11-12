import { PhonePreview } from "@/components/preview/PhonePreview";

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ manage?: string | string[] }> }) {
  const { manage } = await searchParams;
  return <PhonePreview initialSection={manage === "admin" || manage === "sites" || manage === "people" ? "directory" : null} initialDirectoryTab={manage === "sites" ? "sites" : "people"} />;
}
