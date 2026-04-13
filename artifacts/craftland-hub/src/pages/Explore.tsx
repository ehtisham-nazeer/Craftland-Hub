import React, { useState } from "react";
import { motion } from "framer-motion";
import { MapCard } from "@/components/MapCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Map as MapIcon, Pin, SlidersHorizontal, X } from "lucide-react";
import { useListMaps } from "@workspace/api-client-react";

const REGIONS = [
  "Bangladesh", "India", "Indonesia", "LATAM", "MENA",
  "Pakistan", "Singapore", "Thailand", "US/Brazil", "Vietnam", "Other"
];

const SORTS = [
  { value: "latest", label: "Latest" },
  { value: "trending", label: "Trending" },
  { value: "most_liked", label: "Most Liked" },
];

function MapGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/6 bg-card overflow-hidden">
          <div className="aspect-video shimmer" />
          <div className="p-4 space-y-3">
            <div className="h-5 w-3/4 shimmer rounded-md" />
            <div className="h-4 w-1/2 shimmer rounded-md" />
            <div className="flex justify-between items-center pt-2">
              <div className="h-4 w-1/4 shimmer rounded-md" />
              <div className="h-8 w-24 shimmer rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Explore() {
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [inputValue, setInputValue] = useState(searchParams.get("search") || "");
  const [region, setRegion] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<"latest" | "trending" | "most_liked">(
    (searchParams.get("sort") as "latest" | "trending" | "most_liked") || "latest"
  );
  const [page, setPage] = useState(1);

  const { data, isLoading } = useListMaps({
    search: search || undefined,
    region,
    sort,
    page,
    limit: 12,
  });

  const maps = data?.maps || [];
  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  const pinnedMaps = maps.filter((m) => m.isPinned);
  const unpinnedMaps = maps.filter((m) => !m.isPinned);

  const hasFilters = !!search || !!region || sort !== "latest";

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(inputValue);
    setPage(1);
  }

  function clearAll() {
    setInputValue("");
    setSearch("");
    setRegion(undefined);
    setSort("latest");
    setPage(1);
  }

  return (
    <div className="flex flex-col w-full min-h-screen page-enter">

      {/* ── HERO HEADER ── */}
      <div className="relative border-b border-white/5 py-12 px-4 overflow-hidden bg-[#0a0a0a]">
        <div className="absolute inset-0 grid-pattern opacity-35 pointer-events-none" />
        <div className="absolute right-0 top-0 w-64 h-64 bg-primary/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="container max-w-screen-2xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: "easeOut" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <MapIcon className="h-4.5 w-4.5 text-primary" />
              <span className="text-primary text-xs font-bold uppercase tracking-widest">Discovery</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight">Explore Maps</h1>
            <p className="text-muted-foreground text-base max-w-xl leading-relaxed">
              Browse custom Free Fire CraftLand maps. Use filters to find exactly what you need.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── STICKY FILTERS ── */}
      <div
        className="sticky top-16 z-30 border-b border-white/5 py-3 px-4"
        style={{
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="container max-w-screen-2xl mx-auto">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search maps, codes, creators..."
                className="pl-10 h-11 bg-card/60 border-white/8 focus:border-primary/40 rounded-xl transition-all text-sm"
              />
              {inputValue && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                  onClick={() => { setInputValue(""); setSearch(""); setPage(1); }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter controls */}
            <div className="flex gap-2 overflow-x-auto pb-0.5 sm:pb-0 scroll-x-mobile sm:overflow-visible">
              <Select
                value={region ?? "all"}
                onValueChange={(val) => { setRegion(val === "all" ? undefined : val); setPage(1); }}
              >
                <SelectTrigger className="h-11 w-[148px] shrink-0 bg-card/60 border-white/8 rounded-xl text-sm">
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select
                value={sort}
                onValueChange={(val) => { setSort(val as typeof sort); setPage(1); }}
              >
                <SelectTrigger className="h-11 w-[148px] shrink-0 bg-card/60 border-white/8 rounded-xl text-sm">
                  <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-60" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Button
                type="submit"
                className="h-11 px-5 shrink-0 bg-primary hover:bg-primary/90 rounded-xl font-semibold btn-glow"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                Search
              </Button>

              {hasFilters && (
                <motion.div whileTap={{ scale: 0.92 }}>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 px-3 shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/6 rounded-xl transition-all"
                    onClick={clearAll}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </motion.div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* ── RESULTS ── */}
      <div className="flex-1 container max-w-screen-2xl mx-auto py-6 px-4">

        {isLoading ? (
          <MapGridSkeleton count={12} />
        ) : maps.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-white/8 rounded-2xl bg-card/20"
          >
            <div className="relative mb-5">
              <MapIcon className="h-14 w-14 text-muted-foreground/20" />
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No maps found</h3>
            <p className="text-muted-foreground mb-6 max-w-sm text-sm leading-relaxed">
              Try adjusting your filters or searching for something else.
            </p>
            <Button
              variant="outline"
              className="border-white/10 hover:border-white/20 hover:bg-white/5 h-10 px-5 rounded-xl"
              onClick={clearAll}
            >
              Clear Filters
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Pinned maps */}
            {pinnedMaps.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Pin className="h-4 w-4 text-amber-400" />
                  <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest">Pinned</h2>
                </div>

                {pinnedMaps.length === 1 ? (
                  <div className="max-w-sm">
                    <MapCard map={pinnedMaps[0]} index={0} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="md:col-span-2 lg:col-span-1">
                      <MapCard map={pinnedMaps[0]} index={0} />
                    </div>
                    {pinnedMaps.slice(1).map((map, idx) => (
                      <MapCard key={map.id} map={map} index={idx + 1} />
                    ))}
                  </div>
                )}
                <div className="mt-6 divider-glow" />
              </div>
            )}

            {/* All maps grid */}
            {unpinnedMaps.length > 0 && (
              <>
                {pinnedMaps.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <MapIcon className="h-4 w-4 text-muted-foreground/50" />
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">All Maps</h2>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {unpinnedMaps.map((map, idx) => (
                    <MapCard key={map.id} map={map} index={idx} />
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-12">
                <motion.div whileTap={{ scale: 0.94 }}>
                  <Button
                    variant="outline"
                    className="border-white/10 bg-card h-11 px-5 rounded-xl hover:border-white/20 transition-all"
                    onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    disabled={page === 1}
                  >
                    ← Previous
                  </Button>
                </motion.div>
                <span className="px-4 py-2.5 rounded-xl bg-card border border-white/8 text-sm font-semibold tabular-nums">
                  {page} / {totalPages}
                </span>
                <motion.div whileTap={{ scale: 0.94 }}>
                  <Button
                    variant="outline"
                    className="border-white/10 bg-card h-11 px-5 rounded-xl hover:border-white/20 transition-all"
                    onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    disabled={page === totalPages}
                  >
                    Next →
                  </Button>
                </motion.div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
