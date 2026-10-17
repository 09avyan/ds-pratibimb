import { notFound } from "next/navigation";
import { TerminalEntry } from "../../components/terminal-entry";
import { uiVariantForVersion } from "@/ui-options";

export const dynamic = "force-dynamic";

export default async function VersionedPlayPage({ params }: { params: Promise<{ version: string }> }) {
  const { version } = await params;
  const uiVariant = uiVariantForVersion(version);
  if (uiVariant === undefined) notFound();
  return <TerminalEntry prefix={`/${version}`}/>;
}
