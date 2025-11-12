import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dedo Duro - GitHub Activity Monitor',
  description: 'Monitora a atividade de colaboradores no GitHub da empresa',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="min-h-screen">
          <header className="border-b bg-white/70 backdrop-blur sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <h1 className="text-xl font-semibold">Dedo Duro</h1>
              <div className="text-sm text-gray-500">GitHub Activity Monitor</div>
            </div>
          </header>
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
