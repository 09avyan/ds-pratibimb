import { notFound } from "next/navigation";
import { Trader } from "../../../../components/trader";
import { UI_OPTIONS, type UiVariant } from "@/ui-options";
import { isValidTerminalPath } from "@/game/terminals";

export const dynamic = "force-dynamic";

export default async function UiPreviewOptionPage({ params }: { params: Promise<{ option: string; terminal: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { option, terminal } = await params;
  const selected = UI_OPTIONS.find(item => item.slug === option);
  if (!selected || !isValidTerminalPath(terminal)) notFound();

  return <Trader mode="test" terminal={Number(terminal)} uiVariant={selected.slug as UiVariant} preview/>;
}
