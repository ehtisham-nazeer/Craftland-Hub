import React, { useRef, useState, useEffect } from "react";
import { useParams } from "wouter";
import { useGetCreator, useGetCreatorMaps, useFollowCreator, getGetCreatorQueryKey, getGetCreatorMapsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { useImageUpload } from "@/hooks/useImageUpload";
import { toast } from "@/lib/toast";
import { MapCard } from "@/components/MapCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Map as MapIcon, Heart, UserPlus, UserMinus, Calendar, MapPin, Pencil, Camera, Loader2, ExternalLink, Clock, ImageIcon, Users, BadgeCheck } from "lucide-react";
import { format } from "date-fns";

export default function CreatorProfile() {
  const { id } = useParams<{ id: string }>();
  const creatorId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const { user } = useUser();

  const { data: creator, isLoading: isCreatorLoading } = useGetCreator(creatorId, {
    query: { enabled: !!creatorId && !isNaN(creatorId), queryKey: getGetCreatorQueryKey(creatorId) }
  });
  
  const { data: maps, isLoading: isMapsLoading } = useGetCreatorMaps(creatorId, {
    query: { enabled: !!creatorId && !isNaN(creatorId), queryKey: getGetCreatorMapsQueryKey(creatorId) }
  });

  const followMutation = useFollowCreator();

  const [isOwner, setIsOwner] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch("/api/creators/me", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((myCreator) => {
        if (myCreator && myCreator.id === creatorId) setIsOwner(true);
      })
      .catch(() => {});
  }, [user, creatorId]);

  const handleFollow = () => {
    if (!user) {
      toast.error("Sign in required", { description: "Please sign in to follow creators." });
      return;
    }
    followMutation.mutate({ id: creatorId }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetCreatorQueryKey(creatorId), (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          return {
            ...old,
            isFollowed: data.following,
            followersCount: (data as { following: boolean; followersCount?: number }).followersCount ?? (
              ((old as { followersCount?: number }).followersCount ?? 0) + (data.following ? 1 : -1)
            ),
          };
        });
        if (data.following) {
          toast.success("Followed ✅", { description: `You're now following ${creator?.name}` });
        } else {
          toast.success("Unfollowed", { description: `You unfollowed ${creator?.name}` });
        }
      }
    });
  };

  const handleEditSaved = () => {
    queryClient.invalidateQueries({ queryKey: getGetCreatorQueryKey(creatorId) });
    setShowEditModal(false);
    toast.success("Changes submitted for review", { description: "An admin will review and publish your edits shortly." });
  };

  if (isCreatorLoading) {
    return (
      <div className="flex flex-col w-full pb-20">
        <Skeleton className="w-full h-64 md:h-80" />
        <div className="container max-w-screen-xl mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-6 relative -mt-16">
            <Skeleton className="h-32 w-32 rounded-xl border-4 border-background shrink-0" />
            <div className="pt-16 md:pt-20 space-y-4 w-full">
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-6 w-1/4" />
              <div className="flex gap-4 pt-4">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="container mx-auto py-20 px-4 text-center">
        <h1 className="text-3xl font-bold text-destructive mb-4">Creator Not Found</h1>
      </div>
    );
  }

  const hasPendingEdit = (creator as { pendingEditStatus?: string | null }).pendingEditStatus === "pending";

  return (
    <div className="flex flex-col w-full pb-20">
      {/* Banner */}
      <div className="w-full h-64 md:h-80 bg-muted relative">
        {creator.banner ? (
          <img src={creator.banner} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-background to-secondary/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-80" />
      </div>

      <div className="container max-w-screen-xl mx-auto px-4">
        {/* Profile Info */}
        <div className="flex flex-col md:flex-row gap-6 items-start relative -mt-20 md:-mt-24 mb-12">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background rounded-2xl shadow-xl bg-card">
            <AvatarImage src={creator.logo || undefined} className="object-cover" />
            <AvatarFallback className="text-5xl font-bold rounded-2xl bg-primary/10 text-primary">
              {creator.name[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="pt-2 md:pt-24 flex-1 flex flex-col md:flex-row justify-between gap-6 w-full">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-4xl font-bold">{creator.name}</h1>
                {creator.isVerified && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-sm font-semibold">
                    <BadgeCheck className="h-4 w-4" /> Verified
                  </span>
                )}
                {hasPendingEdit && isOwner && (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Edit Pending Review
                  </Badge>
                )}
              </div>
              {creator.bio && <p className="text-muted-foreground max-w-2xl mb-4">{creator.bio}</p>}
              
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground font-medium">
                {creator.region && (
                  <span className="flex items-center gap-1.5 bg-card px-3 py-1 rounded-full border border-border/50">
                    <MapPin className="h-4 w-4 text-primary" /> {creator.region}
                  </span>
                )}
                <span className="flex items-center gap-1.5 bg-card px-3 py-1 rounded-full border border-border/50">
                  <Calendar className="h-4 w-4" /> Joined {format(new Date(creator.createdAt), 'MMM yyyy')}
                </span>
                {(creator as { socialLink?: string | null }).socialLink && (
                  <a
                    href={(creator as { socialLink?: string | null }).socialLink!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-card px-3 py-1 rounded-full border border-border/50 hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" /> Social / YouTube
                  </a>
                )}
              </div>
            </div>
            
            <div className="flex flex-row md:flex-col items-center md:items-end gap-4">
              <div className="flex gap-3 text-center">
                <div className="bg-card border border-border/50 px-5 py-2 rounded-xl">
                  <div className="text-2xl font-bold">{creator.totalMaps}</div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center justify-center gap-1">
                    <MapIcon className="h-3 w-3" /> Maps
                  </div>
                </div>
                <div className="bg-card border border-border/50 px-5 py-2 rounded-xl">
                  <div className="text-2xl font-bold text-primary">{creator.totalLikes.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center justify-center gap-1">
                    <Heart className="h-3 w-3" /> Likes
                  </div>
                </div>
                <div className="bg-card border border-primary/20 px-5 py-2 rounded-xl">
                  <motion.div
                    key={creator.followersCount}
                    initial={{ scale: 1.2, color: "#FF6B00" }}
                    animate={{ scale: 1, color: "#f2f2f2" }}
                    transition={{ duration: 0.3 }}
                    className="text-2xl font-bold"
                  >
                    {(creator.followersCount ?? 0).toLocaleString()}
                  </motion.div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" /> Followers
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }}>
                <Button 
                  size="lg" 
                  variant={creator.isFollowed ? "outline" : "default"}
                  className={`w-full md:w-auto transition-all duration-200 ${!creator.isFollowed ? 'bg-primary text-primary-foreground hover:bg-primary/90 btn-glow shadow-lg shadow-primary/20' : 'border-primary/30 text-primary hover:bg-primary/10'}`}
                  onClick={handleFollow}
                  disabled={followMutation.isPending}
                >
                  <AnimatePresence mode="wait">
                    {creator.isFollowed ? (
                      <motion.span key="unfollow" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="flex items-center">
                        <UserMinus className="mr-2 h-5 w-5" /> Unfollow
                      </motion.span>
                    ) : (
                      <motion.span key="follow" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="flex items-center">
                        <UserPlus className="mr-2 h-5 w-5" /> Follow Creator
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
                </motion.div>
                {isOwner && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full md:w-auto border-primary/40 hover:border-primary text-primary"
                    onClick={() => setShowEditModal(true)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    {hasPendingEdit ? "Edit Profile (Pending)" : "Edit Profile"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Maps List */}
        <div>
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border/40">
            <MapIcon className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Maps by {creator.name}</h2>
          </div>
          
          {isMapsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="w-full aspect-[16/9] rounded-xl" />
              ))}
            </div>
          ) : maps && maps.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {maps.map((map, idx) => (
                <MapCard key={map.id} map={map} index={idx} />
              ))}
            </div>
          ) : (
            <div className="py-24 text-center border border-dashed border-white/8 rounded-2xl glass-card flex flex-col items-center gap-4">
              <div className="relative">
                <MapIcon className="h-16 w-16 text-primary/20" />
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
              </div>
              <div>
                <p className="text-lg font-semibold mb-1">No maps dropped yet</p>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  This creator hasn't dropped any maps yet. Stay tuned!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <EditProfileModal
          creator={creator as EditableCreator}
          onClose={() => setShowEditModal(false)}
          onSaved={handleEditSaved}
        />
      )}
    </div>
  );
}

interface EditableCreator {
  id: number;
  name: string;
  bio?: string | null;
  logo?: string | null;
  banner?: string | null;
  socialLink?: string | null;
  region?: string | null;
  createdAt: string;
  pendingEditStatus?: string | null;
}

function EditProfileModal({
  creator,
  onClose,
  onSaved,
}: {
  creator: EditableCreator;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [bio, setBio] = useState(creator.bio ?? "");
  const [socialLink, setSocialLink] = useState((creator as { socialLink?: string | null }).socialLink ?? "");

  // Logo state
  const [logoPreview, setLogoPreview] = useState<string | null>(creator.logo ?? null);
  const [logoUrl, setLogoUrl] = useState<string | null>(creator.logo ?? null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Banner state
  const [bannerPreview, setBannerPreview] = useState<string | null>(creator.banner ?? null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(creator.banner ?? null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [activeUpload, setActiveUpload] = useState<"logo" | "banner" | null>(null);

  const { uploadFile: uploadLogo, isUploading: isUploadingLogo } = useImageUpload({
    onSuccess: (url: string) => {
      setLogoUrl(url);
      setActiveUpload(null);
      toast.success("Logo uploaded");
    },
    onError: () => {
      setActiveUpload(null);
      toast.error("Logo upload failed");
    },
  });

  const { uploadFile: uploadBanner, isUploading: isUploadingBanner } = useImageUpload({
    onSuccess: (url: string) => {
      setBannerUrl(url);
      setActiveUpload(null);
      toast.success("Banner uploaded");
    },
    onError: () => {
      setActiveUpload(null);
      toast.error("Banner upload failed");
    },
  });

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    setActiveUpload("logo");
    await uploadLogo(file);
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerPreview(URL.createObjectURL(file));
    setActiveUpload("banner");
    await uploadBanner(file);
  };

  const isUploading = isUploadingLogo || isUploadingBanner;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/creators/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bio || null,
          socialLink: socialLink || null,
          logo: logoUrl,
          banner: bannerUrl,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Failed to update profile");
      }
      onSaved();
    } catch (err) {
      toast.error("Update Failed", { description: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card border-border/60 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" /> Edit Creator Profile
          </DialogTitle>
          <p className="text-sm text-amber-400/90 flex items-center gap-1.5 pt-1">
            <Clock className="h-3.5 w-3.5" />
            Changes will be reviewed by an admin before going live.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Banner Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" /> Profile Banner
            </Label>
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={isUploading}
              className="relative group w-full h-28 rounded-xl overflow-hidden border-2 border-dashed border-primary/40 hover:border-primary transition-colors bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Change banner"
            >
              {bannerPreview ? (
                <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 text-primary/40" />
                  <span className="text-xs font-medium text-primary/60">Click to upload banner (16:9 recommended)</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                {activeUpload === "banner" ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Camera className="h-6 w-6 text-white" />
                    <span className="text-white text-xs font-medium">Change Banner</span>
                  </div>
                )}
              </div>
            </button>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} disabled={isUploading} />
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" /> Creator Logo
            </Label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploading}
                className="relative group h-20 w-20 rounded-full overflow-hidden border-2 border-dashed border-primary/50 hover:border-primary transition-colors bg-background focus:outline-none focus:ring-2 focus:ring-primary shrink-0"
                aria-label="Change logo"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-primary/40 text-3xl font-bold">
                    {creator.name[0].toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  {activeUpload === "logo" ? (
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </div>
              </button>
              <p className="text-xs text-muted-foreground">Tap the circle to change your creator logo. Square images work best.</p>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} disabled={isUploading} />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-bio">Bio</Label>
            <Textarea
              id="edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about yourself…"
              className="min-h-[90px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
          </div>

          {/* Social Link */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-social">Social / YouTube Link</Label>
            <Input
              id="edit-social"
              type="url"
              value={socialLink}
              onChange={(e) => setSocialLink(e.target.value)}
              placeholder="https://youtube.com/@yourchannel"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving || isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {isSaving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
            ) : isUploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</>
            ) : (
              "Submit for Review"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
