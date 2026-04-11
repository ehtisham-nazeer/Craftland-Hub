import React from "react";
import { Link, useLocation } from "wouter";
import { Home, Compass, PlusSquare, Users, User, Bell } from "lucide-react";
import { Show, useUser } from "@clerk/react";
import { useListNotifications, getListNotificationsQueryKey } from "@workspace/api-client-react";

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
      className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <span className={`relative transition-all duration-200 ${active ? "nav-active-glow" : ""}`}>
        {icon}
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-black leading-none">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className={`text-[10px] font-medium leading-none ${active ? "text-primary" : "text-muted-foreground/70"}`}>
        {label}
      </span>
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full shadow-[0_0_8px_rgba(255,107,0,0.8)]" />
      )}
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#111]/95 backdrop-blur-xl border-t border-white/8 safe-area-pb">
      <div className="flex items-stretch h-16">
        <BottomNavItem href="/" icon={<Home className="h-5 w-5" />} label="Home" active={location === "/"} />
        <BottomNavItem href="/explore" icon={<Compass className="h-5 w-5" />} label="Explore" active={location === "/explore"} />
        <BottomNavItem href="/submit" icon={<PlusSquare className="h-5 w-5" />} label="Submit" active={location === "/submit"} />
        <BottomNavItem href="/creators" icon={<Users className="h-5 w-5" />} label="Creators" active={location === "/creators"} />

        <Show when="signed-in">
          <BottomNavItem
            href="/notifications"
            icon={<Bell className="h-5 w-5" />}
            label="Alerts"
            active={location === "/notifications"}
            badge={unreadCount}
          />
        </Show>

        <Show when="signed-out">
          <BottomNavItem href="/profile" icon={<User className="h-5 w-5" />} label="Profile" active={location === "/profile"} />
        </Show>
      </div>
    </nav>
  );
}
