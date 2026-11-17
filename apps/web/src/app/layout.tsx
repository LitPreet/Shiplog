import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
// Mono only appears in small code snippets: no need to preload it on every page.
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], preload: false });
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  // Only the italic is used (hero accent words), so skip downloading the upright style.
  style: "italic",
});

export const metadata: Metadata = {
  title: {
    default: "Shiplog: in-app feedback that closes the loop",
    template: "%s · Shiplog",
  },
  description:
    "Add one script tag. Your users suggest ideas, vote, and see what ships, without leaving your product.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
