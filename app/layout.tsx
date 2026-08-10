
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientRootLayout from "@/components/ClientRootLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Cairo Airport - AI Photobooth Console",
    description: "Official Cairo Airport Company AI Photobooth Management Console",
    icons: {
        icon: "/CAC-Logo.png",
        shortcut: "/CAC-Logo.png",
        apple: "/CAC-Logo.png",
    },
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
