import "./globals.css";

export const metadata = {
  title: "AI-AudioSense",
  description: "Demo de análisis de sonido industrial con IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
