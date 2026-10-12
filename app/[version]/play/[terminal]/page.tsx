import { notFound } from "next/navigation";
import { Trader } from "../../../components/trader";
import { UI_OPTIONS } from "@/ui-options";

export const dynamic = "force-dynamic";

export default async function VersionedNumberedPlayPage({ params }: { params: Promise<{ version: string; terminal: string }> }) {
  const { version, terminal } = await params;
  const option = UI_OPTIONS.find(item => item.version === version);
  if (!option || !/^0[1-9]$|^1[0-2]$/.test(terminal)) notFound();
  return <Trader mode="live" terminal={Number(terminal)} uiVariant={option.slug} />;
}
