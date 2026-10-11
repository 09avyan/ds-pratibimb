import { notFound } from "next/navigation";
import { Trader } from "../../components/trader";

export const dynamic = "force-dynamic";

export default async function NumberedPlayPage({ params }: { params: Promise<{ terminal: string }> }) {
  const { terminal } = await params;
  if (!/^0[1-9]$|^1[0-2]$/.test(terminal)) notFound();
  return <Trader mode="live" terminal={Number(terminal)} />;
}
