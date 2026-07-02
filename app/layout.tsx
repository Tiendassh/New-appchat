import type {Metadata} from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Incognito Chat | Voz, Video y Texto Anónimo',
  description: 'Sala de chat grupal y emparejamiento aleatorio 1-a-1 en tiempo real con voz y video. 100% anónimo, sin registros ni almacenamiento de historial.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-slate-950 text-slate-100" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
