import type { Metadata } from 'next';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'LearnUp',
  description: 'Your private YouTube learning library.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('LearnUp_theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}if(typeof window!=='undefined'){window.addEventListener('error',function(e){if(e&&(e.message==='Script error.'||(!e.error&&!e.message))){try{e.preventDefault();}catch(_){}}});}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}


