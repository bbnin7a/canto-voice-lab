import type { Metadata } from "next";
import "../src/client/styles.css";

export const metadata: Metadata = {
  title: "Canto Voice Lab",
  description: "Compare Cantonese speech output from your own provider accounts."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
