import React, { useState } from "react";
import { Link } from "wouter";
import { useListCreators } from "@workspace/api-client-react";
import { CreatorCard } from "@/components/CreatorCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, UserPlus, X } from "lucide-react";
import { motion } from "framer-motion";

export default function Creators() {
  const [search, setSearch] = useState("");
  const [inputValue, setInputValue] = useState("");
  
  const { data: creators, isLoading } = useListCreators({ search: search || undefined });

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] page-enter">
      {/* Hero header */}
      <div className="relative border-b border-white/5 py-12 px-4 overflow-hidden bg-[#0e0e0e]">
        <div className="absolute inset-0 grid-pattern opacity-35 pointer-events-none" />
        <div className="absolute left-0 top-0 w-72 h-72 bg-primary/7 rounded-full blur-[100px] pointer-events-none" />
        <div className="container max-w-screen-2xl mx-auto relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: "easeOut" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-primary text-xs font-bold uppercase tracking-widest">Community</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight">Top Creators</h1>
            <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
              Meet the talented builders behind the most popular Free Fire CraftLand maps.
            </p>
          </motion.div>

          <Button
            asChild
            className="shrink-0 h-11 px-6 gap-2 font-semibold btn-glow bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 rounded-xl"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <Link href="/join-creator">
              <UserPlus className="h-4 w-4" />
              Join as Creator
            </Link>
          </Button>
        </div>
      </div>

      {/* Search + Grid */}
      <div className="container max-w-screen-2xl mx-auto py-6 px-4 flex-1 flex flex-col">
        <form onSubmit={(e) => { e.preventDefault(); setSearch(inputValue); }} className="relative max-w-md mb-7">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search creators by name..."
            className="pl-10 pr-10 h-11 w-full bg-card border-white/8 rounded-xl text-sm focus:border-primary/40 transition-all"
          />
          {inputValue && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              onClick={() => { setInputValue(""); setSearch(""); }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/6 bg-card overflow-hidden">
                  <Skeleton className="w-full h-16" />
                  <div className="p-4 flex flex-col items-center">
                    <Skeleton className="h-14 w-14 rounded-full -mt-7 mb-3 border-2 border-card" />
                    <Skeleton className="h-4 w-2/3 mb-2 rounded-md" />
                    <Skeleton className="h-3 w-1/3 mb-4 rounded-md" />
                    <div className="flex w-full justify-center gap-4 pt-2 border-t border-white/5">
                      <Skeleton className="h-4 w-12 rounded" />
                      <Skeleton className="h-4 w-12 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : creators && creators.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {creators.map((creator, idx) => (
                <CreatorCard key={creator.id} creator={creator} index={idx} />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-white/8 rounded-2xl glass-card"
            >
              <div className="relative mb-5">
                <Users className="h-16 w-16 text-primary/15" />
                <div className="absolute inset-0 bg-primary/8 rounded-full blur-2xl" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No creators found</h3>
              <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
                {search ? `No creators match "${search}". Try a different name.` : "No approved creators yet. Be the first to join!"}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
