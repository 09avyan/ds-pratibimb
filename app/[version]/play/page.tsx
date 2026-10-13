import { notFound } from "next/navigation";
import { Trader } from "../../components/trader";
import { uiVariantForVersion } from "@/ui-options";

export const dynamic = "force-dynamic";

export default async function VersionedPlayPage({ params }: { params: Promise<{ version: string }> }) {
  const { version } = await params;
  const uiVariant = uiVariantForVersion(version);
  if (uiVariant === undefined) notFound();
  return <Trader mode="live" uiVariant={uiVariant ?? undefined} />;
}
