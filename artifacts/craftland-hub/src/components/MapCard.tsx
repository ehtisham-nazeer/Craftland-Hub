import React from "react";
import { Link } from "wouter";
import { Map } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Heart, Eye, MapPin, Copy, Check, Pin, TrendingUp, Star, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

interface MapCardProps {
  map: Map;
  index?: number;
  variant?: "default" | "featured" | "compact";
}

export function MapCard({ map, index = 0, variant = "default" }: MapCardProps) {
  const [copied, setCopied] = React.useState(false);

  const copyCode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(map.code);
    setCopied(true);
    toast.success("Code copied!", {
      description: `${map.code} is ready to paste in-game`,
      duration: 2500,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.32, delay: Math.min(index * 0.06, 0.3), ease: "easeOut" }}
        whileTap={{ scale: 0.98 }}
      >
        <Link href={`/map/${map.id}`}>
          <div className="group flex gap-3 p-3 rounded-xl border border-white/6 glass-card hover:border-primary/30 card-hover cursor-pointer">
            {/* Thumbnail */}
            <div className="w-20 h-14 rounded-lg bg-muted overflow-hidden shrink-0 img-zoom-container">
              {map.image ? (
                <img
                  src={map.image}
                  alt={map.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted/50">
                  <MapPin className="h-5 w-5 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors duration-200">
                {map.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate">by {map.creatorName || "Unknown"}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart className={`h-3.5 w-3.5 transition-colors ${map.isLiked ? "fill-primary text-primary" : ""}`} />
                  {map.likes.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {map.views.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Copy button */}
            <motion.div whileTap={{ scale: 0.9 }} className="self-center shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 font-map-code text-xs border-white/8 bg-white/4 hover:bg-primary/15 hover:border-primary/40 hover:text-primary transition-all duration-200 px-2.5"
                onClick={copyCode}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {map.code}
              </Button>
            </motion.div>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.38,
        delay: Math.min(index * 0.07, 0.45),
        ease: [0.4, 0, 0.2, 1],
      }}
      whileHover={{ y: -5, scale: 1.025 }}
      whileTap={{ scale: 0.97 }}
    >
      <Link href={`/map/${map.id}`}>
        <div className="group relative rounded-2xl border border-white/8 glass-card overflow-hidden card-hover cursor-pointer h-full flex flex-col">
          {/* Image with zoom */}
          <div className="relative overflow-hidden img-zoom-container" style={{ aspectRatio: "16/9" }}>
            {map.image ? (
              <img
                src={map.image}
                alt={map.name}
                className="object-cover w-full h-full"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#141414]">
                <MapPin className="h-12 w-12 text-white/10" />
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

            {/* Top badges */}
            <div className="absolute top-2.5 left-2.5 flex gap-1 flex-wrap">
              {map.isPinned && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/95 text-black text-[10px] font-bold shadow-md shadow-black/40 backdrop-blur-sm">
                  <Pin className="h-2.5 w-2.5" /> Pinned
                </span>
              )}
              {map.isFeatured && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold shadow-md shadow-primary/40">
                  <Star className="h-2.5 w-2.5 fill-white" /> Featured
                </span>
              )}
              {map.isTrending && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/85 text-white text-[10px] font-bold backdrop-blur-sm shadow-md">
                  <TrendingUp className="h-2.5 w-2.5" /> Hot
                </span>
              )}
              {map.isVerified && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/85 text-white text-[10px] font-bold backdrop-blur-sm shadow-md">
                  <BadgeCheck className="h-2.5 w-2.5" /> Verified
                </span>
              )}
            </div>

            {/* Region badge */}
            {map.region && (
              <div className="absolute bottom-2.5 right-2.5">
                <span className="px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md border border-white/10 text-white text-[10px] font-medium">
                  {map.region}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4 flex flex-col flex-1">
            <div className="flex-1">
              <h3 className="font-bold text-[15px] leading-snug line-clamp-1 group-hover:text-primary transition-colors duration-200">
                {map.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                by{" "}
                <span className="text-foreground/75 group-hover:text-foreground/90 transition-colors">
                  {map.creatorName || "Unknown"}
                </span>
              </p>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Heart
                    className={`h-4 w-4 transition-all duration-200 ${
                      map.isLiked ? "fill-primary text-primary scale-110" : ""
                    }`}
                  />
                  <span className="tabular-nums">{map.likes.toLocaleString()}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  <span className="tabular-nums">{map.views.toLocaleString()}</span>
                </span>
              </div>

              <motion.div whileTap={{ scale: 0.88 }}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 font-map-code text-xs border-white/8 bg-white/4 hover:bg-primary/15 hover:border-primary/50 hover:text-primary transition-all duration-200"
                  onClick={copyCode}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {map.code}
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
