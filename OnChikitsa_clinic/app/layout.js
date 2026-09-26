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
  title: 'OnChikitsa Clinic',
  description: 'OnChikitsa for clinics — manage doctors, appointments, the live queue, payments and more.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#1c74e0',
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
