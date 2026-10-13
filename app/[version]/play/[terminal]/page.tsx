import { notFound } from "next/navigation";
import { Trader } from "../../../components/trader";
import { uiVariantForVersion } from "@/ui-options";

export const dynamic = "force-dynamic";

export default async function VersionedNumberedPlayPage({ params }: { params: Promise<{ version: string; terminal: string }> }) {
  const { version, terminal } = await params;
  const uiVariant = uiVariantForVersion(version);
  if (uiVariant === undefined || !/^0[1-9]$|^1[0-2]$/.test(terminal)) notFound();
  return <Trader mode="live" terminal={Number(terminal)} uiVariant={uiVariant ?? undefined} />;
}
