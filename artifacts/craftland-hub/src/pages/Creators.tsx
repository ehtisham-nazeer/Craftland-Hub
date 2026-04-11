import React, { useState } from "react";
import { Link } from "wouter";
import { useListCreators } from "@workspace/api-client-react";
import { CreatorCard } from "@/components/CreatorCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, UserPlus } from "lucide-react";

export default function Creators() {
  const [search, setSearch] = useState("");
  
  const { data: creators, isLoading } = useListCreators({ search: search || undefined });

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)]">
      <div className="relative border-b border-white/5 py-14 px-4 overflow-hidden bg-[#0e0e0e]">
        <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />
        <div className="absolute left-0 top-0 w-72 h-72 bg-primary/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="container max-w-screen-2xl mx-auto relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-primary text-sm font-semibold uppercase tracking-widest">Community</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight">Top Creators</h1>
            <p className="text-muted-foreground text-base max-w-2xl">
              Meet the talented builders behind the most popular Free Fire CraftLand maps.
            </p>
          </div>
          <Button asChild className="shrink-0 h-11 px-6 gap-2 font-semibold btn-glow bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25">
            <Link href="/join-creator">
              <UserPlus className="h-4 w-4" />
              Join as Creator
            </Link>
          </Button>
        </div>
      </div>

      <div className="container max-w-screen-2xl mx-auto py-8 px-4 flex-1 flex flex-col">
        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search creators by name..."
            className="pl-10 h-10 w-full bg-card"
          />
        </div>

        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="rounded-xl border border-border/50 bg-card overflow-hidden">
                  <Skeleton className="w-full h-24" />
                  <div className="p-4 flex flex-col items-center">
                    <Skeleton className="h-20 w-20 rounded-full -mt-14 mb-4 border-4 border-card" />
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <div className="flex w-full justify-around pt-4 border-t">
                      <Skeleton className="h-10 w-12" />
                      <Skeleton className="h-10 w-12" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : creators && creators.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {creators.map((creator, idx) => (
                <CreatorCard key={creator.id} creator={creator} index={idx} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-white/8 rounded-2xl glass-card">
              <div className="relative mb-5">
                <Users className="h-16 w-16 text-primary/20" />
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No creators found</h3>
              <p className="text-muted-foreground max-w-md">
                {search ? `No creators match "${search}". Try a different name.` : "No approved creators yet. Be the first to join!"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
