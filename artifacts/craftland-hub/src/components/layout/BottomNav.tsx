import React from "react";
import { Link, useLocation } from "wouter";
import { Home, Compass, PlusSquare, Users, User, Bell } from "lucide-react";
import { SignedIn, SignedOut, useUser } from '@clerk/react';
import { useListNotifications, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";

function BottomNavItem({
  href,
  icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 select-none transition-colors duration-200 ${
        active ? "text-primary" : "text-muted-foreground/70 hover:text-muted-foreground"
      }`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* Active indicator pill at top */}
      <AnimatePresence>
        {active && (
          <motion.span
            layoutId="bottom-nav-pill"
            className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-primary rounded-full"
            style={{
              boxShadow: "0 0 10px rgba(255,107,0,0.9), 0 0 20px rgba(255,107,0,0.4)",
            }}
            initial={{ opacity: 0, scaleX: 0.4 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0.4 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />
        )}
      </AnimatePresence>

      {/* Active background highlight */}
      {active && (
        <motion.span
          className="absolute inset-x-1 inset-y-0.5 rounded-xl bg-primary/8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}

      <motion.span
        className={`relative z-10 transition-all duration-200 ${active ? "nav-active-glow" : ""}`}
        animate={active ? { scale: 1.1 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {icon}
        {badge != null && badge > 0 && (
          <motion.span
            className="absolute -top-1.5 -right-2 flex h-[18px] min-w-[18px] px-0.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white leading-none shadow-lg shadow-primary/50"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            {badge > 9 ? "9+" : badge}
          </motion.span>
        )}
      </motion.span>

      <span
        className={`text-[10px] font-semibold leading-none z-10 transition-all duration-200 ${
          active ? "text-primary opacity-100" : "opacity-60"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useUser();
  const { data: notifications } = useListNotifications({
    query: { enabled: !!user, queryKey: getListNotificationsQueryKey() },
  });
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: "rgba(8, 8, 8, 0.97)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-stretch h-[3.75rem]">
        <BottomNavItem href="/" icon={<Home className="h-[22px] w-[22px]" />} label="Home" active={location === "/"} />
        <BottomNavItem href="/explore" icon={<Compass className="h-[22px] w-[22px]" />} label="Explore" active={location === "/explore"} />
        <BottomNavItem href="/submit" icon={<PlusSquare className="h-[22px] w-[22px]" />} label="Submit" active={location === "/submit"} />
        <BottomNavItem href="/creators" icon={<Users className="h-[22px] w-[22px]" />} label="Creators" active={location === "/creators"} />

        <SignedIn>
          <BottomNavItem
            href="/notifications"
            icon={<Bell className="h-[22px] w-[22px]" />}
            label="Alerts"
            active={location === "/notifications"}
            badge={unreadCount}
          />
        </SignedIn>

        <SignedOut>
          <BottomNavItem href="/profile" icon={<User className="h-[22px] w-[22px]" />} label="Profile" active={location === "/profile"} />
        </SignedOut>
      </div>
    </nav>
  );
}
