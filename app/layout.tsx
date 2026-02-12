import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { ToastProvider } from "@/lib/contexts/ToastContext";
import { CoreProvider } from "@/lib/contexts/CoreContext";
import { BackgroundTaskProvider } from "@/lib/contexts/BackgroundTaskContext";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";
import { AccountRegistryProvider } from "@/lib/contexts/AccountRegistryContext";
import { WorkspaceProvider } from "@/lib/contexts/WorkspaceContext";
import BackgroundTaskPanel from "@/components/BackgroundTaskPanel";
import AccountLoginModal from "@/components/AccountLoginModal";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SEO OS",
  description: "SEO Operating System - Manage your WordPress sites and AI-generated content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <AccountRegistryProvider>
              <WorkspaceProvider>
                <QueryProvider>
                  <CoreProvider>
                    <BackgroundTaskProvider>
                      <ToastProvider>
                        {children}
                        <BackgroundTaskPanel />
                        <AccountLoginModal />
                      </ToastProvider>
                    </BackgroundTaskProvider>
                  </CoreProvider>
                </QueryProvider>
              </WorkspaceProvider>
            </AccountRegistryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
