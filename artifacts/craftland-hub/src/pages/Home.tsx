import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Flame, Star, Clock, Trophy, Map as MapIcon, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapCard } from "@/components/MapCard";
import { CreatorCard } from "@/components/CreatorCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  useGetFeaturedMaps,
  useGetTrendingMaps,
  useGetMostLikedMaps,
  useListMaps,
  useListCreators
} from "@workspace/api-client-react";

function useCountUp(target: number, duration = 1.8) {
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);
  useEffect(() => {
    if (target <= 0 || startedRef.current) return;
    startedRef.current = true;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (startTime === null) startTime = ts;
      const progress = Math.min((ts - startTime) / (duration * 1000), 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
      else setDisplay(target);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return display;
}

function StatItem({ value, label, suffix = "+" }: { value: number; label: string; suffix?: string }) {
  const count = useCountUp(value);
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-extrabold text-foreground">
        {count > 0 ? `${count.toLocaleString()}${suffix}` : "—"}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function SectionHeader({ icon, title, label, href }: { icon: React.ReactNode; title: string; label?: string; href?: string }) {
  const [, setLocation] = useLocation();
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/15">
          {icon}
        </div>
        <div>
          {label && <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-0.5">{label}</p>}
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
      </div>
      {href && (
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1 text-sm" onClick={() => setLocation(href)}>
          View all <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    localStorage.setItem("craftland_visited", "1");
  }, []);

  const { data: featuredMaps, isLoading: isFeaturedLoading } = useGetFeaturedMaps();
  const { data: trendingMaps, isLoading: isTrendingLoading } = useGetTrendingMaps();
  const { data: mostLikedMaps, isLoading: isMostLikedLoading } = useGetMostLikedMaps();
  const { data: recentMapsData, isLoading: isRecentLoading } = useListMaps({ sort: "latest", limit: 4 });
  const { data: creatorsData, isLoading: isCreatorsLoading } = useListCreators({ search: "" });
  const { data: statsData } = useQuery<{ totalMaps: number; totalCreators: number; totalPlayers: number }>({
    queryKey: ["/api/stats/public"],
    queryFn: () => fetch("/api/stats/public").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const recentMaps = recentMapsData?.maps || [];
  const creators = creatorsData?.slice(0, 4) || [];

  return (
    <div className="flex flex-col w-full">

      {/* ── HERO ─────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-24 pb-16 overflow-hidden">
        {/* Background glow orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/12 rounded-full blur-[130px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-700/10 rounded-full blur-[120px]" />
          <div className="grid-pattern absolute inset-0 opacity-60" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, ease: "easeOut" }}
          className="relative z-10 max-w-5xl mx-auto"
        >
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium mb-10">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary font-semibold tracking-wide">The #1 Free Fire CraftLand Platform</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tight mb-6 leading-[1.05]">
            Discover. Play.<br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-amber-400">
              Dominate.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Browse thousands of custom CraftLand maps, follow top creators, and share your own maps with the global Free Fire community.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="h-13 px-8 text-base font-bold w-full sm:w-auto btn-glow bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 gap-2"
              onClick={() => setLocation("/explore")}
            >
              Explore Maps
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-13 px-8 text-base w-full sm:w-auto border-white/10 bg-white/4 hover:bg-white/8 hover:border-white/20 backdrop-blur-sm"
              onClick={() => setLocation("/submit")}
            >
              Submit Your Map
            </Button>
          </div>

          {/* Stats strip */}
          <div className="flex items-center justify-center gap-10 mt-10 text-sm text-muted-foreground">
            <StatItem value={statsData?.totalMaps ?? 0} label="Maps" />
            <div className="w-px h-8 bg-white/10" />
            <StatItem value={statsData?.totalCreators ?? 0} label="Creators" />
            <div className="w-px h-8 bg-white/10" />
            <StatItem value={statsData?.totalPlayers ?? 0} label="Players" />
          </div>
        </motion.div>
      </section>

      {/* ── FEATURED MAPS ────────────────────────── */}
      <section className="py-12 px-4 md:px-8 border-t border-white/5 bg-[#0e0e0e]">
        <div className="container max-w-screen-2xl mx-auto">
          <SectionHeader
            icon={<Star className="h-5 w-5 text-primary" />}
            label="Curated"
            title="Featured Maps"
            href="/explore?sort=featured"
          />

          {isFeaturedLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/6 bg-card overflow-hidden">
                  <div className="aspect-video shimmer" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 w-2/3 shimmer rounded" />
                    <div className="h-4 w-1/3 shimmer rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredMaps && featuredMaps.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredMaps.slice(0, 4).map((map, idx) => (
                <MapCard key={map.id} map={map} index={idx} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center border border-dashed border-white/8 rounded-2xl text-muted-foreground">
              No featured maps yet. Check back soon.
            </div>
          )}
        </div>
      </section>

      {/* ── TRENDING MAPS ────────────────────────── */}
      <section className="py-12 px-4 md:px-8 border-t border-white/5">
        <div className="container max-w-screen-2xl mx-auto">
          <SectionHeader
            icon={<Flame className="h-5 w-5 text-primary" />}
            label="On Fire"
            title="Trending Now"
            href="/explore?sort=trending"
          />
          {isTrendingLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/6 bg-card overflow-hidden">
                  <div className="aspect-video shimmer" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 w-2/3 shimmer rounded" />
                    <div className="h-4 w-1/3 shimmer rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : trendingMaps && trendingMaps.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {trendingMaps.slice(0, 4).map((map, idx) => (
                <motion.div
                  key={map.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: idx * 0.07 }}
                >
                  <MapCard map={map} index={idx} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center border border-dashed border-white/8 rounded-2xl text-muted-foreground">
              No trending maps yet.
            </div>
          )}
        </div>
      </section>

      {/* ── MOST LIKED ───────────────────────────── */}
      <section className="py-12 px-4 md:px-8 bg-[#0e0e0e] border-t border-white/5">
        <div className="container max-w-screen-2xl mx-auto">
          <SectionHeader
            icon={<Trophy className="h-5 w-5 text-primary" />}
            label="Hall of Fame"
            title="Most Liked"
            href="/explore?sort=most_liked"
          />
          <div className="space-y-2">
            {isMostLikedLoading
              ? Array(4).fill(0).map((_, i) => <div key={i} className="h-20 shimmer rounded-xl" />)
              : mostLikedMaps && mostLikedMaps.length > 0
                ? mostLikedMaps.slice(0, 4).map((map, idx) => (
                    <motion.div
                      key={map.id}
                      initial={{ opacity: 0, x: 16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: idx * 0.07 }}
                    >
                      <MapCard map={map} index={idx} variant="compact" />
                    </motion.div>
                  ))
                : <p className="text-muted-foreground py-8 text-center">No maps yet.</p>
            }
          </div>
        </div>
      </section>

      {/* ── RECENT MAPS ──────────────────────────── */}
      <section className="py-12 px-4 md:px-8 border-t border-white/5">
        <div className="container max-w-screen-2xl mx-auto">
          <SectionHeader
            icon={<Clock className="h-5 w-5 text-primary" />}
            label="Just Dropped"
            title="Latest Maps"
            href="/explore?sort=latest"
          />
          {isRecentLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/6 bg-card overflow-hidden">
                  <div className="aspect-video shimmer" />
                  <div className="p-4 space-y-2">
                    <div className="h-5 w-3/4 shimmer rounded" />
                    <div className="h-4 w-1/2 shimmer rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentMaps.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentMaps.map((map, idx) => (
                <MapCard key={map.id} map={map} index={idx} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center border border-dashed border-white/8 rounded-2xl text-muted-foreground">
              No maps yet.
            </div>
          )}
        </div>
      </section>

      {/* ── TOP CREATORS ─────────────────────────── */}
      <section className="py-12 px-4 md:px-8 bg-[#0e0e0e] border-t border-white/5">
        <div className="container max-w-screen-2xl mx-auto">
          <SectionHeader
            icon={<Users className="h-5 w-5 text-primary" />}
            label="Community"
            title="Top Creators"
            href="/creators"
          />
          {isCreatorsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/6 bg-card overflow-hidden">
                  <div className="h-28 shimmer" />
                  <div className="p-4 flex flex-col items-center gap-2">
                    <div className="h-20 w-20 rounded-full shimmer -mt-10" />
                    <div className="h-5 w-24 shimmer rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : creators.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {creators.map((creator, idx) => (
                <CreatorCard key={creator.id} creator={creator} index={idx} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center border border-dashed border-white/8 rounded-2xl text-muted-foreground">
              No creators yet.
            </div>
          )}
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────── */}
      <section className="py-16 px-4 md:px-8 border-t border-white/5">
        <div className="container max-w-screen-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/8 via-[#0d0d0d] to-orange-900/5 p-12 text-center"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-primary/20 blur-[80px] pointer-events-none" />
            <div className="relative z-10">
              <MapIcon className="h-10 w-10 text-primary mx-auto mb-5" />
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
                Ready to share your map?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                Join thousands of creators and get your CraftLand map discovered by players around the world.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="h-12 px-8 font-bold btn-glow bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 gap-2"
                  onClick={() => setLocation("/submit")}
                >
                  Submit Your Map <ArrowRight className="h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 border-primary/30 bg-primary/5 hover:bg-primary/15 hover:border-primary/60 text-primary btn-glow"
                  onClick={() => setLocation("/join-creator")}
                >
                  Become a Creator
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
