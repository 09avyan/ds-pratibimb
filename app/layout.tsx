import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./new-ui-themes.css";
import "./nostalgia-themes.css";

export const metadata: Metadata = {
  title: "Dalaal Street — The Fintech Floor",
  description: "A fictional Indian stock market simulation for Pratibimb.",
  applicationName: "Dalaal Street",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0c3142" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
