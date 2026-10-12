import { notFound } from "next/navigation";
import { Trader } from "../../../../components/trader";
import { UI_OPTIONS, type UiVariant } from "@/ui-options";

export const dynamic = "force-dynamic";

export default async function UiPreviewOptionPage({ params }: { params: Promise<{ option: string; terminal: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { option, terminal } = await params;
  const selected = UI_OPTIONS.find(item => item.slug === option);
  if (!selected || !/^0[1-9]$|^1[0-2]$/.test(terminal)) notFound();

  return <Trader mode="test" terminal={Number(terminal)} uiVariant={selected.slug as UiVariant} preview/>;
}
