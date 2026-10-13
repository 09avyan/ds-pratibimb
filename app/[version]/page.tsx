import { notFound, redirect } from "next/navigation";
import { uiVariantForVersion } from "@/ui-options";

export default async function VersionHome({ params }: { params: Promise<{ version: string }> }) {
  const { version } = await params;
  if (uiVariantForVersion(version) === undefined) notFound();
  redirect(`/${version}/play`);
}
