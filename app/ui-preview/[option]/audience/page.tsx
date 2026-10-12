import { notFound } from "next/navigation";
import { Trader } from "../../../components/trader";
import { UI_OPTIONS, type UiVariant } from "@/ui-options";

export const dynamic = "force-dynamic";

export default async function UiPreviewAudiencePage({ params }: { params: Promise<{ option: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { option } = await params;
  const selected = UI_OPTIONS.find(item => item.slug === option);
  if (!selected) notFound();

  return <Trader mode="test" audienceOnly uiVariant={selected.slug as UiVariant} preview/>;
}
