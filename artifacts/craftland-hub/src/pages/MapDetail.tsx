import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetMap,
  useLikeMap,
  useBookmarkMap,
  getGetMapQueryKey,
  useListComments,
  useCreateComment,
  useDeleteComment,
  useCreateReport,
  useRecordMapView,
  getListCommentsQueryKey,
} from "@workspace/api-client-react";
import type { Comment, CreateReportBodyReason, Map as MapType } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { useUser, Show } from "@clerk/react";
import { useUpload } from "@workspace/object-storage-web";
import {
  Heart, Bookmark, Share2, Copy, Flag, Check, Eye, MapPin,
  Calendar, Trash2, Send, MessageSquare, Twitter, Facebook, Link2, MessageCircle,
  Pencil, Loader2, Clock, ImageIcon, Globe, ExternalLink
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

const REPORT_REASONS: { value: CreateReportBodyReason; label: string }[] = [
  { value: "spam", label: "Spam or Misleading" },
  { value: "invalid_code", label: "Invalid Map Code" },
  { value: "inappropriate_content", label: "Inappropriate Content" },
  { value: "other", label: "Other" },
];

export default function MapDetail() {
  const { id } = useParams<{ id: string }>();
  const mapId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const { user } = useUser();

  const [copied, setCopied] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState<CreateReportBodyReason>("other");
  const [reportDescription, setReportDescription] = useState("");
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: number; username: string } | null>(null);
  const [isMapOwner, setIsMapOwner] = useState(false);
  const [showEditMapModal, setShowEditMapModal] = useState(false);

  const { data: map, isLoading, isError } = useGetMap(mapId, {
    query: {
      enabled: !!mapId && !isNaN(mapId),
      queryKey: getGetMapQueryKey(mapId),
    },
  });

  const { data: comments, isLoading: commentsLoading } = useListComments(mapId, {
    query: { enabled: !!mapId && !isNaN(mapId), queryKey: getListCommentsQueryKey(mapId) },
  });

  const createCommentMutation = useCreateComment();
  const deleteCommentMutation = useDeleteComment();
  const createReportMutation = useCreateReport();
  const likeMutation = useLikeMap();
  const bookmarkMutation = useBookmarkMap();
  const recordViewMutation = useRecordMapView();

  useEffect(() => {
    if (mapId && !isNaN(mapId)) {
      recordViewMutation.mutate({ id: mapId });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId]);

  // Detect if the current user is the creator of this map
  useEffect(() => {
    if (!user || !map?.creatorId) return;
    fetch("/api/creators/me", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((myCreator) => {
        if (myCreator && myCreator.id === map.creatorId) setIsMapOwner(true);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, map?.creatorId]);

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopyCode = () => {
    if (!map) return;
    navigator.clipboard.writeText(map.code);
    setCopied(true);
    toast.success("Code Copied!", { description: "Map code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pageUrl);
    toast.success("Link copied!", { description: "Map link copied to clipboard" });
  };

  const handleLike = () => {
    if (!user) {
      toast.error("Sign in required", { description: "Please sign in to like maps." });
      return;
    }
    likeMutation.mutate({ id: mapId }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetMapQueryKey(mapId), (old: MapType | undefined) =>
          old ? { ...old, isLiked: data.liked, likes: data.likes } : old
        );
      },
    });
  };

  const handleBookmark = () => {
    if (!user) {
      toast.error("Sign in required", { description: "Please sign in to bookmark maps." });
      return;
    }
    bookmarkMutation.mutate({ id: mapId }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetMapQueryKey(mapId), (old: MapType | undefined) =>
          old ? { ...old, isBookmarked: data.bookmarked } : old
        );
        toast.success(data.bookmarked ? "Map Bookmarked" : "Bookmark Removed");
      },
    });
  };

  const handleSubmitComment = () => {
    if (!user) {
      toast.error("Sign in required", { description: "Please sign in to comment." });
      return;
    }
    if (!commentText.trim()) return;
    createCommentMutation.mutate(
      { mapId, data: { content: commentText.trim(), parentId: replyTo?.id ?? null } },
      {
        onSuccess: () => {
          setCommentText("");
          setReplyTo(null);
          queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(mapId) });
        },
      }
    );
  };

  const handleDeleteComment = (commentId: number) => {
    deleteCommentMutation.mutate({ id: commentId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(mapId) });
        toast.success("Comment deleted");
      },
    });
  };

  const handleSubmitReport = () => {
    createReportMutation.mutate(
      { data: { mapId, reason: reportReason, description: reportDescription || null } },
      {
        onSuccess: () => {
          setShowReportDialog(false);
          setReportReason("other");
          setReportDescription("");
          toast.success("Report Submitted", { description: "Thank you for helping keep the community safe." });
        },
        onError: () => {
          toast.error("Report failed", { description: "Unable to submit report. Please try again." });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="container max-w-screen-xl mx-auto py-8 px-4">
        <Skeleton className="w-full aspect-[21/9] md:aspect-[3/1] rounded-2xl mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !map) {
    return (
      <div className="container mx-auto py-20 px-4 text-center">
        <h1 className="text-3xl font-bold text-destructive mb-4">Map Not Found</h1>
        <p className="text-muted-foreground mb-8">The map you are looking for doesn't exist or has been removed.</p>
        <Link href="/explore">
          <Button>Back to Explore</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-20 page-enter">

      {/* Cover Image — 16:9 on mobile, banner on desktop */}
      <div className="w-full bg-muted relative aspect-video md:aspect-[21/7] overflow-hidden">
        {map.image ? (
          <img src={map.image} alt={map.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center">
            <MapPin className="h-20 w-20 text-muted-foreground/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />

        {/* Badges overlaid top-left */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="bg-black/50 backdrop-blur-md border-white/15 text-white text-xs">{map.region}</Badge>
          {map.isFeatured && <Badge className="bg-primary text-white text-xs">Featured</Badge>}
          {map.isTrending && <Badge className="bg-orange-500 text-white text-xs">Trending</Badge>}
        </div>
      </div>

      {/* Map Info Block — fully below the image, always fully visible */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="container max-w-screen-xl mx-auto px-4 pt-4 pb-2"
      >
        <div className="flex flex-col gap-3">
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-foreground leading-tight">{map.name}</h1>

          {/* Creator */}
          {map.creatorId ? (
            <Link href={`/creator/${map.creatorId}`} className="inline-flex items-center gap-2 self-start hover:bg-card/60 px-3 py-1.5 rounded-full transition-all duration-200 border border-border/40 active:scale-95">
              <Avatar className="h-7 w-7">
                <AvatarImage src={map.creatorLogo ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">{map.creatorName?.[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">{map.creatorName ?? "Unknown Creator"}</span>
            </Link>
          ) : map.creatorName ? (
            <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full border border-border/40">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/20 text-primary text-xs">{map.creatorName[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">{map.creatorName}</span>
            </div>
          ) : null}

          {/* Map Code — prominent, full-width on mobile */}
          <motion.div
            whileTap={{ scale: 0.985 }}
            className="flex items-center gap-3 bg-card border border-primary/20 px-4 py-3 rounded-xl shadow-sm shadow-primary/5"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-0.5">Map Code</p>
              <p className="font-mono text-2xl font-extrabold text-primary tracking-wider">{map.code}</p>
            </div>
            <Button size="lg" variant="secondary" onClick={handleCopyCode} className="h-11 px-4 shrink-0 gap-2 rounded-xl" style={{ WebkitTapHighlightColor: "transparent" }}>
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span key="check" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Check className="h-5 w-5 text-green-500" />
                  </motion.span>
                ) : (
                  <motion.span key="copy" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Copy className="h-5 w-5" />
                  </motion.span>
                )}
              </AnimatePresence>
              <span className="text-sm font-semibold">{copied ? "Copied!" : "Copy"}</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Content Grid */}
      <div className="container max-w-screen-xl mx-auto px-4 mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Action buttons — horizontally scrollable on mobile */}
            <div className="flex items-center gap-2 pb-4 border-b border-border/40 overflow-x-auto scroll-x-mobile">
              <motion.div whileTap={{ scale: 0.93 }} className="shrink-0">
                <Button
                  variant={map.isLiked ? "default" : "outline"}
                  size="lg"
                  className={`gap-2 h-11 rounded-xl ${map.isLiked ? "bg-primary text-primary-foreground" : "border-white/10"}`}
                  onClick={handleLike}
                  disabled={likeMutation.isPending}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <Heart className={`h-5 w-5 transition-transform ${map.isLiked ? "fill-current scale-110" : ""}`} />
                  <span className="font-bold tabular-nums">{map.likes.toLocaleString()}</span>
                  <span className="hidden sm:inline">Likes</span>
                </Button>
              </motion.div>

              <motion.div whileTap={{ scale: 0.93 }} className="shrink-0">
                <Button
                  variant={map.isBookmarked ? "default" : "outline"}
                  size="lg"
                  className={`gap-2 h-11 rounded-xl ${map.isBookmarked ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" : "border-white/10"}`}
                  onClick={handleBookmark}
                  disabled={bookmarkMutation.isPending}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <Bookmark className={`h-5 w-5 ${map.isBookmarked ? "fill-current" : ""}`} />
                  <span className="hidden sm:inline">{map.isBookmarked ? "Saved" : "Save"}</span>
                </Button>
              </motion.div>

              <motion.div whileTap={{ scale: 0.93 }} className="shrink-0">
                <Button variant="outline" size="lg" className="gap-2 h-11 rounded-xl border-white/10" onClick={() => setShowShareDialog(true)} style={{ WebkitTapHighlightColor: "transparent" }}>
                  <Share2 className="h-5 w-5" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
              </motion.div>

              <div className="ml-auto flex items-center gap-2 shrink-0">
                {isMapOwner && (
                  <motion.div whileTap={{ scale: 0.93 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-primary/40 hover:border-primary text-primary rounded-xl h-9"
                      onClick={() => setShowEditMapModal(true)}
                      style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {(map as { pendingEditStatus?: string | null }).pendingEditStatus === "pending" ? "Edit (Pending)" : "Edit Map"}
                      </span>
                    </Button>
                  </motion.div>
                )}
                <Show when="signed-in">
                  <motion.div whileTap={{ scale: 0.93 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive rounded-xl h-9"
                      onClick={() => setShowReportDialog(true)}
                      style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                      <Flag className="h-4 w-4 mr-1.5" /> Report
                    </Button>
                  </motion.div>
                </Show>
              </div>
            </div>

            {/* Comments Section */}
            <div>
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                Comments{" "}
                {comments && comments.length > 0 && (
                  <span className="text-muted-foreground text-lg font-normal">({comments.length})</span>
                )}
              </h3>

              {/* Comment form */}
              <div className="bg-card border border-border/50 rounded-xl p-4 mb-6">
                {replyTo && (
                  <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                    <span>Replying to <strong className="text-foreground">@{replyTo.username}</strong></span>
                    <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs" onClick={() => setReplyTo(null)}>
                      Cancel
                    </Button>
                  </div>
                )}
                <Textarea
                  placeholder={user ? "Write a comment... (Ctrl+Enter to submit)" : "Sign in to comment"}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={!user}
                  className="bg-background border-border/50 resize-none min-h-[80px] mb-3"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) handleSubmitComment();
                  }}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={handleSubmitComment}
                    disabled={!user || !commentText.trim() || createCommentMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                    {createCommentMutation.isPending ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </div>

              {/* Comments list */}
              {commentsLoading ? (
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments && comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment: Comment) => (
                    <div key={comment.id} className="flex gap-3 group">
                      <Avatar className="h-10 w-10 shrink-0 mt-0.5 border-2 border-border/50">
                        <AvatarImage src={comment.avatar ?? undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {comment.username?.[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{comment.username ?? "Anonymous"}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed">{comment.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                            onClick={() =>
                              setReplyTo({ id: comment.id, username: comment.username ?? "user" })
                            }
                          >
                            Reply
                          </Button>
                          {user?.id === comment.userId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteComment(comment.id)}
                              disabled={deleteCommentMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-3 pl-4 border-l-2 border-border/40 space-y-3">
                            {comment.replies.map((reply: Comment) => (
                              <div key={reply.id} className="flex gap-3 group">
                                <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                                  <AvatarImage src={reply.avatar ?? undefined} />
                                  <AvatarFallback className="bg-secondary/20 text-secondary text-xs">
                                    {reply.username?.[0]?.toUpperCase() ?? "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-sm">{reply.username ?? "Anonymous"}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(reply.createdAt), "MMM d, yyyy")}
                                    </span>
                                  </div>
                                  <p className="text-sm text-foreground/90 leading-relaxed">{reply.content}</p>
                                  {user?.id === reply.userId && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 mt-1 text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => handleDeleteComment(reply.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center border border-dashed border-border/50 rounded-xl text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No comments yet</p>
                  <p className="text-sm mt-1">Be the first to share your thoughts!</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-card border border-border/50 rounded-xl p-6">
              <h3 className="font-bold text-lg mb-4">Map Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Eye className="h-4 w-4" /> Views
                  </div>
                  <span className="font-bold">{map.views.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" /> Added
                  </div>
                  <span className="font-medium">{format(new Date(map.createdAt), "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> Region
                  </div>
                  <span className="font-medium">{map.region}</span>
                </div>
              </div>
            </div>

            {map.mapLink && (
              <Button className="w-full h-12 text-lg" variant="secondary" asChild>
                <a href={map.mapLink} target="_blank" rel="noopener noreferrer">
                  Play Map (External Link)
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share "{map.name}"</DialogTitle>
            <DialogDescription>Share this map with your friends</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
              <p className="flex-1 text-sm text-muted-foreground truncate">{pageUrl}</p>
              <Button size="sm" variant="ghost" className="shrink-0" onClick={handleCopyLink}>
                <Link2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">Or share on social media</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                className="gap-2"
                asChild
              >
                <a
                  href={`https://twitter.com/intent/tweet?text=Check out "${map.name}" on CraftLand Hub! Map code: ${map.code}&url=${encodeURIComponent(pageUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Twitter className="h-4 w-4" /> Twitter
                </a>
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                asChild
              >
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out "${map.name}" on CraftLand Hub! Map code: ${map.code}\n${pageUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                asChild
              >
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook className="h-4 w-4" /> Facebook
                </a>
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const text = `Check out "${map.name}" on CraftLand Hub! Map code: ${map.code}\n${pageUrl}`;
                  navigator.clipboard.writeText(text);
                  toast.success("Copied to clipboard!");
                  setShowShareDialog(false);
                }}
              >
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowShareDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Map</DialogTitle>
            <DialogDescription>
              Help us keep CraftLand Hub safe. Tell us what's wrong with this map.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="report-reason">Reason</Label>
              <Select value={reportReason} onValueChange={(v) => setReportReason(v as CreateReportBodyReason)}>
                <SelectTrigger id="report-reason" className="mt-1">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="report-desc">Additional Details (optional)</Label>
              <Textarea
                id="report-desc"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Describe the issue in more detail..."
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleSubmitReport}
              disabled={createReportMutation.isPending}
            >
              {createReportMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Map Modal */}
      {showEditMapModal && map && (
        <EditMapModal
          map={map}
          onClose={() => setShowEditMapModal(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: getGetMapQueryKey(mapId) });
            setShowEditMapModal(false);
            toast.success("Edit submitted for review", {
              description: "An admin will review and publish your changes shortly.",
            });
          }}
        />
      )}
    </div>
  );
}

const REGIONS = [
  "Bangladesh", "India", "Indonesia", "LATAM", "MENA",
  "Pakistan", "Singapore", "Thailand", "US/Brazil", "Vietnam", "Other"
];

function EditMapModal({
  map,
  onClose,
  onSaved,
}: {
  map: MapType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(map.name);
  const [code, setCode] = useState(map.code);
  const [mapLink, setMapLink] = useState(map.mapLink ?? "");
  const [region, setRegion] = useState(map.region);
  const [imagePreview, setImagePreview] = useState<string | null>(map.image ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(map.image ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (res: { objectPath: string }) => {
      const url = `/api/storage${res.objectPath}`;
      setImageUrl(url);
      toast.success("Cover image uploaded");
    },
    onError: () => toast.error("Image upload failed"),
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    await uploadFile(file);
  };

  const handleSave = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error("Map name and code are required");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/maps/${map.id}/submit-edit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim(),
          image: imageUrl,
          mapLink: mapLink.trim() || null,
          region,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Failed to submit edit");
      }
      onSaved();
    } catch (err) {
      toast.error("Edit Failed", { description: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setIsSaving(false);
    }
  };

  const hasPending = (map as { pendingEditStatus?: string | null }).pendingEditStatus === "pending";

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card border-border/60 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" /> Edit Map
          </DialogTitle>
          {hasPending && (
            <p className="text-sm text-amber-400/90 flex items-center gap-1.5 pt-1">
              <Clock className="h-3.5 w-3.5" /> A previous edit is pending review. Submitting again will replace it.
            </p>
          )}
          {!hasPending && (
            <p className="text-sm text-amber-400/90 flex items-center gap-1.5 pt-1">
              <Clock className="h-3.5 w-3.5" /> Changes will be reviewed by an admin before going live.
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cover Image */}
          <div className="space-y-2">
            <Label>Cover Image</Label>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploading}
              className="relative group w-full h-36 rounded-xl overflow-hidden border-2 border-dashed border-primary/40 hover:border-primary transition-colors bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 text-primary/40" />
                  <span className="text-xs font-medium text-primary/60">Click to upload cover image</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                {isUploading ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
              </div>
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={isUploading} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-map-name">Map Name *</Label>
            <Input id="edit-map-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Map name" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-map-code">Map Code *</Label>
            <Input id="edit-map-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 123456789" className="font-mono" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-map-region">Region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger id="edit-map-region">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-map-link" className="flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> External Play Link (optional)
            </Label>
            <Input id="edit-map-link" type="url" value={mapLink} onChange={(e) => setMapLink(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving || isUploading}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || isUploading} className="bg-primary hover:bg-primary/90 text-white">
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> :
              isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</> :
              "Submit for Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Re-export Camera icon locally for EditMapModal
function Camera({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3"/>
    </svg>
  );
}
