import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NAVER 뉴스 AI 어시스턴트 PoC',
  description: 'NAVER 뉴스 AI 어시스턴트 PoC',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
