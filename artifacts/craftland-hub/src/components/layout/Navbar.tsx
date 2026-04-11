import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Show, useUser, useClerk } from "@clerk/react";
import { Bell, Search, Menu, User, LogOut, Shield, X, ChevronRight, Gavel } from "lucide-react";
import { CraftLandLogoIcon } from "@/components/CraftLandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useGetMe, useListNotifications, getGetMeQueryKey, getListNotificationsQueryKey } from "@workspace/api-client-react";

const SUPER_ADMIN_EMAIL = "ehtishamnazeer54@gmail.com";
const MODERATOR_EMAIL = "ehtishamnazeeer@gmail.com";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const { data: me } = useGetMe({ query: { enabled: !!user, queryKey: getGetMeQueryKey() } });
  const { data: notifications } = useListNotifications({ query: { enabled: !!user, queryKey: getListNotificationsQueryKey() } });

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const hasAdminRole = me?.role === "admin" || me?.role === "super_admin" || me?.role === "moderator";
  const isSuperAdmin = hasAdminRole && userEmail === SUPER_ADMIN_EMAIL;
  const isModerator = hasAdminRole && userEmail === MODERATOR_EMAIL;
  const isAnyAdmin = isSuperAdmin || isModerator;

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get("search") as string;
    if (search) {
      setLocation(`/explore?search=${encodeURIComponent(search)}`);
      setMobileSearchOpen(false);
    }
  };

  const navLinks = [
    { href: "/explore", label: "Explore" },
    { href: "/creators", label: "Creators" },
    { href: "/submit", label: "Submit Map" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full glass-nav">
      <div className="container flex h-16 max-w-screen-2xl items-center px-4 md:px-6 gap-4">

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden shrink-0 text-muted-foreground hover:text-foreground">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] bg-[#111] border-r border-white/5 p-0">
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-white/5">
                <Link href="/" className="flex items-center gap-3">
                  <CraftLandLogoIcon size={38} />
                  <span className="font-extrabold text-lg tracking-tight">
                    CraftLand <span className="text-primary">Hub</span>
                  </span>
                </Link>
              </div>
              <nav className="flex-1 p-4 space-y-1">
                {navLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      location === href
                        ? "bg-primary/15 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    {label}
                    <ChevronRight className="h-4 w-4 opacity-40" />
                  </Link>
                ))}

                {/* Admin links in mobile menu */}
                {isSuperAdmin && (
                  <Link
                    href="/admin-dashboard"
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all text-primary bg-primary/5 border border-primary/15 hover:bg-primary/10"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Super Admin
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-40" />
                  </Link>
                )}
                {isModerator && !isSuperAdmin && (
                  <Link
                    href="/admin-dashboard"
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all text-amber-400 bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10"
                  >
                    <span className="flex items-center gap-2">
                      <Gavel className="h-4 w-4" /> Moderation Panel
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-40" />
                  </Link>
                )}
              </nav>
              <div className="p-4 border-t border-white/5">
                <Show when="signed-out">
                  <div className="space-y-2">
                    <Button className="w-full" onClick={() => setLocation("/sign-in")}>Sign In</Button>
                    <Button variant="outline" className="w-full" onClick={() => setLocation("/sign-up")}>Sign Up</Button>
                  </div>
                </Show>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <CraftLandLogoIcon size={34} />
          <span className="font-extrabold text-lg text-foreground tracking-tight hidden sm:block">
            CraftLand <span className="text-primary">Hub</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                location === href
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Search */}
        <div className="flex-1 max-w-md ml-auto hidden md:block">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              type="search"
              name="search"
              placeholder="Search maps, creators, codes..."
              className="h-9 w-full pl-9 bg-white/5 border-white/8 rounded-xl text-sm focus-visible:ring-primary/50 placeholder:text-muted-foreground/50"
            />
          </form>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto md:ml-2">
          {/* Mobile search toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          >
            {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>

          <Show when="signed-in">
            {/* Notifications */}
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground h-9 w-9">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                )}
              </Button>
            </Link>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 ring-2 ring-transparent hover:ring-primary/30 transition-all">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
                    <AvatarFallback className="bg-primary/15 text-primary text-sm font-bold">
                      {user?.firstName?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60 bg-[#141414] border-white/8" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.imageUrl} />
                      <AvatarFallback className="bg-primary/15 text-primary text-sm font-bold">{user?.firstName?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <p className="text-sm font-semibold leading-none truncate">{user?.fullName}</p>
                      <p className="text-xs leading-none text-muted-foreground mt-1 truncate">
                        {user?.primaryEmailAddress?.emailAddress}
                      </p>
                      {isSuperAdmin && (
                        <span className="mt-1 text-[10px] font-bold text-primary uppercase tracking-wider">Super Admin</span>
                      )}
                      {isModerator && !isSuperAdmin && (
                        <span className="mt-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider">Moderator</span>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer text-muted-foreground hover:text-foreground focus:text-foreground gap-2.5 py-2.5">
                  <User className="h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>

                {/* Super Admin link */}
                {isSuperAdmin && (
                  <DropdownMenuItem
                    onClick={() => setLocation("/admin-dashboard")}
                    className="cursor-pointer gap-2.5 py-2.5 text-primary focus:text-primary focus:bg-primary/8"
                  >
                    <Shield className="h-4 w-4" />
                    <span className="font-bold">Super Admin</span>
                  </DropdownMenuItem>
                )}

                {/* Moderator link — only for moderator email, not super admin */}
                {isModerator && !isSuperAdmin && (
                  <DropdownMenuItem
                    onClick={() => setLocation("/admin-dashboard")}
                    className="cursor-pointer gap-2.5 py-2.5 text-amber-400 focus:text-amber-400 focus:bg-amber-500/8"
                  >
                    <Gavel className="h-4 w-4" />
                    <span className="font-bold">Moderation Panel</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem
                  onClick={() => signOut(() => setLocation("/"))}
                  className="cursor-pointer text-destructive focus:text-destructive gap-2.5 py-2.5"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Show>

          <Show when="signed-out">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/sign-in")} className="hidden sm:flex text-sm text-muted-foreground hover:text-foreground">
              Sign In
            </Button>
            <Button size="sm" onClick={() => setLocation("/sign-up")} className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold btn-glow h-9 px-4">
              Sign Up
            </Button>
          </Show>
        </div>
      </div>

      {/* Mobile search bar */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 pb-3 border-t border-white/5 pt-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              type="search"
              name="search"
              autoFocus
              placeholder="Search maps, creators..."
              className="h-10 pl-9 bg-white/5 border-white/8 rounded-xl text-sm focus-visible:ring-primary/50"
            />
          </form>
        </div>
      )}
    </header>
  );
}
