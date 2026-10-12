import { notFound } from "next/navigation";
import { Trader } from "../../components/trader";
import { UI_OPTIONS } from "@/ui-options";

export const dynamic = "force-dynamic";

export default async function VersionedPlayPage({ params }: { params: Promise<{ version: string }> }) {
  const { version } = await params;
  const option = UI_OPTIONS.find(item => item.version === version);
  if (!option) notFound();
  return <Trader mode="live" uiVariant={option.slug} />;
}
