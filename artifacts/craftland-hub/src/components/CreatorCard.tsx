import React from "react";
import { Link } from "wouter";
import { Creator } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Heart, Users, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CreatorCardProps {
  creator: Creator;
  index?: number;
}

export function CreatorCard({ creator, index = 0 }: CreatorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -3 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/creator/${creator.id}`}>
        <div className="group relative rounded-2xl border border-white/8 glass-card overflow-hidden card-hover cursor-pointer">

          {/* Banner */}
          <div className="h-16 relative overflow-hidden">
            {creator.banner ? (
              <img
                src={creator.banner}
                alt={`${creator.name} banner`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1f1200] via-[#1a0f00] to-[#0d0d0d]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
          </div>

          <div className="px-3 pb-4 pt-0">
            {/* Avatar — smaller, less pullup */}
            <div className="-mt-7 mb-2 flex justify-center">
              <Avatar className="h-14 w-14 border-2 border-[#1a1a1a] shadow-lg bg-card ring-2 ring-transparent group-hover:ring-primary/30 transition-all duration-200">
                <AvatarImage src={creator.logo || undefined} alt={creator.name} />
                <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                  {creator.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Name + verified */}
            <div className="text-center mb-1.5">
              <div className="flex items-center justify-center gap-1 flex-wrap">
                <h3 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors duration-200 line-clamp-1">
                  {creator.name}
                </h3>
                {creator.isVerified && (
                  <BadgeCheck className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" title="Verified" />
                )}
              </div>
              {creator.region && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-[10px] text-muted-foreground">
                  {creator.region}
                </span>
              )}
            </div>

            {/* Stats — compact inline row */}
            <div className="flex items-center justify-center gap-3 pt-2 border-t border-white/5 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Heart className="h-3 w-3 text-primary/70" />
                <span className="font-semibold text-foreground">{creator.totalLikes.toLocaleString()}</span>
              </div>
              <div className="w-px h-3.5 bg-white/10" />
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3 text-primary/70" />
                <span className="font-semibold text-foreground">{(creator.followersCount ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

        </div>
      </Link>
    </motion.div>
  );
}
