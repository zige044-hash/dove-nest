import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "鳩巢 DoveNest｜讓故事，有個棲身之處",
  description: "閱讀、書寫，讓文字飛向更遠的地方。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body><Providers>{children}</Providers></body></html>;
}
