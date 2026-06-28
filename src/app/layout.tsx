import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Café Vent de Douceurs",
  description: "Bienvenue au Café Vent de Douceurs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
