import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HarvestLink — Direct farmer-to-buyer harvest contracts",
  description:
    "Fair harvest contracts with 0% platform commission. Negotiate, agree, and pay an advance — directly between farmers and buyers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-zinc-900 antialiased">
        {children}
      </body>
    </html>
  );
}
