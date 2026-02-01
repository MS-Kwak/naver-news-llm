import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YSPF Text-to-SQL PoC',
  description: '양계장 관리 시스템 - 자연어 데이터 조회',
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
