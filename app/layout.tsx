
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientRootLayout from "@/components/ClientRootLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "AI Photobooth Dashboard",
    description: "Management dashboard for AI Photobooth projects",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <ClientRootLayout>{children}</ClientRootLayout>
            </body>
        </html>
    );
}
