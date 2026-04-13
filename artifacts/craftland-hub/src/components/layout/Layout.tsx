import React from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { BottomNav } from "./BottomNav";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary/30 selection:text-primary">
      <Navbar />
      <main className="flex-1 flex flex-col relative w-full">
        {/* Subtle noise texture for depth */}
        <div
          className="fixed inset-0 opacity-[0.025] pointer-events-none mix-blend-overlay z-0"
          aria-hidden="true"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          }}
        />

        <div className="relative z-10 w-full flex-1 flex flex-col pb-[3.75rem] md:pb-0">
          {children}
        </div>
      </main>
      <Footer />
      <BottomNav />
      <PushNotificationPrompt />
    </div>
  );
}
