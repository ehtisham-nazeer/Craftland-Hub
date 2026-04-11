import React, { useState } from "react";
import { motion } from "framer-motion";
import { MapCard } from "@/components/MapCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Map as MapIcon, Pin, SlidersHorizontal } from "lucide-react";
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
            <div className="h-5 w-3/4 shimmer rounded" />
            <div className="h-4 w-1/2 shimmer rounded" />
            <div className="flex justify-between pt-2">
              <div className="h-4 w-1/4 shimmer rounded" />
              <div className="h-8 w-1/3 shimmer rounded" />
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
    <div className="flex flex-col w-full min-h-screen">

      {/* ── HERO HEADER ───────────────── */}
      <div className="relative border-b border-white/5 py-14 px-4 overflow-hidden bg-[#0a0a0a]">
        <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />
        <div className="absolute right-0 top-0 w-64 h-64 bg-primary/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="container max-w-screen-2xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex items-center gap-2 mb-2">
              <MapIcon className="h-5 w-5 text-primary" />
              <span className="text-primary text-sm font-semibold uppercase tracking-widest">Discovery</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight">Explore Maps</h1>
            <p className="text-muted-foreground text-base max-w-xl">
              Browse thousands of custom Free Fire CraftLand maps. Use filters to find exactly what you need.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── FILTERS ───────────────────── */}
      <div className="sticky top-16 z-30 bg-background/90 backdrop-blur-xl border-b border-white/5 py-4 px-4">
        <div className="container max-w-screen-2xl mx-auto">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search maps, codes, creators..."
                className="pl-10 h-10 bg-card border-white/8 focus:border-primary/40"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-0.5 md:pb-0">
              <Select
                value={region ?? "all"}
                onValueChange={(val) => { setRegion(val === "all" ? undefined : val); setPage(1); }}
              >
                <SelectTrigger className="h-10 w-[145px] shrink-0 bg-card border-white/8">
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
                <SelectTrigger className="h-10 w-[145px] shrink-0 bg-card border-white/8">
                  <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Button type="submit" className="h-10 px-4 shrink-0 bg-primary hover:bg-primary/90">
                Search
              </Button>

              {hasFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 px-3 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={clearAll}
                >
                  Clear
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* ── RESULTS ───────────────────── */}
      <div className="flex-1 container max-w-screen-2xl mx-auto py-8 px-4">

        {isLoading ? (
          <MapGridSkeleton count={12} />
        ) : maps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-white/8 rounded-2xl bg-card/20">
            <MapIcon className="h-14 w-14 text-muted-foreground/25 mb-4" />
            <h3 className="text-2xl font-bold mb-2">No maps found</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Try adjusting your filters or search for something else.
            </p>
            <Button variant="outline" className="border-white/10" onClick={clearAll}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            {/* Pinned maps row */}
            {pinnedMaps.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Pin className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-widest">Pinned</h2>
                </div>

                {/* Bento: first pinned is wide, rest are normal */}
                {pinnedMaps.length === 1 ? (
                  <div className="max-w-md">
                    <MapCard map={pinnedMaps[0]} index={0} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Featured wide slot */}
                    <div className="md:col-span-2 lg:col-span-1">
                      <MapCard map={pinnedMaps[0]} index={0} />
                    </div>
                    {pinnedMaps.slice(1).map((map, idx) => (
                      <MapCard key={map.id} map={map} index={idx + 1} />
                    ))}
                  </div>
                )}
                <div className="mt-6 border-t border-white/5" />
              </div>
            )}

            {/* Main bento grid */}
            {unpinnedMaps.length > 0 && (
              <>
                {pinnedMaps.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <MapIcon className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">All Maps</h2>
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
                <Button
                  variant="outline"
                  className="border-white/10 bg-card"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Previous
                </Button>
                <span className="px-4 py-2 rounded-lg bg-card border border-white/8 text-sm font-medium">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  className="border-white/10 bg-card"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next →
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
