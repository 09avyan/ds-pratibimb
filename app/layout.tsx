import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./new-ui-themes.css";
import "./ui-theme-v2.css";
import "./ui-theme-v3.css";
import "./ui-theme-v4.css";
import "./ui-theme-v5.css";
import "./ui-theme-v6.css";
import "./ui-theme-v7.css";
import "./ui-audience.css";
import "./ui-news.css";
import "./ui-polish.css";
import "./ui-host-news.css";

export const metadata: Metadata = {
  title: "Dalaal Street — The Fintech Floor",
  description: "A fictional Indian stock market simulation for Pratibimb.",
  applicationName: "Dalaal Street",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0c3142" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
