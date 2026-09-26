import { Open_Sans } from 'next/font/google';
import './globals.css';
import NativeShell from './_components/NativeShell';

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata = {
  title: 'OnChikitsa',
  description: 'OnChikitsa — book clinic appointments with trusted doctors near you.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#6978d4',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={openSans.variable}>
      <body>
        <div className="app-frame">{children}</div>
        <NativeShell />
      </body>
    </html>
  );
}
