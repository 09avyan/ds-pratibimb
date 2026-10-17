import { notFound } from "next/navigation";
import { Trader } from "../../components/trader";
import { isValidTerminalPath } from "@/game/terminals";

export const dynamic = "force-dynamic";

export default async function NumberedTestPage({ params }: { params: Promise<{ terminal: string }> }) {
  const { terminal } = await params;
  if (!isValidTerminalPath(terminal)) notFound();
  return <Trader mode="test" terminal={Number(terminal)} />;
}
