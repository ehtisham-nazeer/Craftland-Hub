import React, { useState } from "react";
import { useUser } from "@clerk/react";
import { Link, useLocation } from "wouter";
import {
  useGetMe,
  useGetAnalyticsSummary,
  useListSubmissions,
  useApproveSubmission,
  useRejectSubmission,
  useListMaps,
  useListReports,
  useResolveReport,
  useDismissReport,
  useGetActivityLogs,
  useGetTopMaps,
  useGetTopCreators,
  useListCreators,
  useDeleteMap,
  useUpdateMap,
  useDeleteCreator,
  useAdjustMapLikes,
  useListCreatorApplications,
  useApproveCreatorApplication,
  useRejectCreatorApplication,
  getListMapsQueryKey,
  getListCreatorsQueryKey,
  getGetAnalyticsSummaryQueryKey,
  getListSubmissionsQueryKey,
  getListReportsQueryKey,
  getGetMeQueryKey,
  getGetTopMapsQueryKey,
  getGetTopCreatorsQueryKey,
  getGetActivityLogsQueryKey,
  getListCreatorApplicationsQueryKey,
} from "@workspace/api-client-react";
import type {
  MapAnalytics,
  CreatorAnalytics,
  ActivityLog,
  Map as MapType,
  Creator,
  Submission,
  Report,
  CreatorApplication,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import {
  Shield, Users, Map, FileText, Activity, AlertTriangle,
  CheckCircle2, XCircle, Eye, Trash2, Edit, TrendingUp,
  Heart, BarChart2, Clock, Minus, Plus, Pin, PinOff, UserCheck, UserX, Star, BadgeCheck,
  Ban, ListChecks,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface PendingCreatorEdit {
  id: number;
  name: string;
  logo?: string | null;
  bio?: string | null;
  pendingEdit?: string | null;
  pendingEditStatus?: string | null;
  createdAt: string;
}

interface PendingMapEdit {
  id: number;
  name: string;
  code: string;
  image?: string | null;
  region: string;
  pendingEdit?: string | null;
  pendingEditStatus?: string | null;
  creatorName?: string | null;
  createdAt: string;
}

function StatCard({ title, value, icon, loading }: { title: string; value?: number; icon: React.ReactNode; loading: boolean }) {
  return (
    <Card className="bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {loading ? <Skeleton className="h-8 w-16" /> : (value ?? 0).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

function SimpleBar({ items, valueKey, nameKey }: { items: (MapAnalytics | CreatorAnalytics)[]; valueKey: string; nameKey: string }) {
  if (!items.length) return <p className="text-muted-foreground text-sm py-4 text-center">No data yet.</p>;
  const maxVal = Math.max(...items.map((i) => {
    const rec = i as unknown as Record<string, number>;
    return rec[valueKey] ?? 0;
  }));
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const rec = item as unknown as Record<string, number | string>;
        const val = (rec[valueKey] as number) ?? 0;
        const name = (rec[nameKey] as string) ?? "";
        const pct = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
        return (
          <div key={item.id} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground truncate w-32 shrink-0">{name}</span>
            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-bold w-12 text-right">{val.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [rejectReason, setRejectReason] = useState("");
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectAppId, setRejectAppId] = useState<number | null>(null);
  const [rejectAppReason, setRejectAppReason] = useState("");

  // Bulk actions — submissions
  const [selectedSubIds, setSelectedSubIds] = useState<Set<number>>(new Set());
  const [showBulkSubDialog, setShowBulkSubDialog] = useState(false);
  const [bulkSubReason, setBulkSubReason] = useState("Spam");
  // Bulk actions — creator apps
  const [selectedAppIds, setSelectedAppIds] = useState<Set<number>>(new Set());
  const [showBulkAppDialog, setShowBulkAppDialog] = useState(false);
  const [bulkAppReason, setBulkAppReason] = useState("Spam");
  const [bulkActionPending, setBulkActionPending] = useState(false);
  const [editMap, setEditMap] = useState<MapType | null>(null);
  const [editMapName, setEditMapName] = useState("");
  const [editMapCode, setEditMapCode] = useState("");
  const [editMapRegion, setEditMapRegion] = useState("");
  const [editMapFeatured, setEditMapFeatured] = useState(false);
  const [editMapTrending, setEditMapTrending] = useState(false);
  const [mapSearch, setMapSearch] = useState("");
  const [likeDelta, setLikeDelta] = useState<Record<number, string>>({});
  const [viewDelta, setViewDelta] = useState<Record<number, string>>({});
  const [followerBoostInput, setFollowerBoostInput] = useState<Record<number, string>>({});
  const [followerBoostPending, setFollowerBoostPending] = useState<number | null>(null);
  const [creatorSearch, setCreatorSearch] = useState("");

  const ADMIN_EMAILS = ["ehtishamnazeer54@gmail.com", "ehtishamnazeeer@gmail.com"];

  const { data: me, isLoading: meLoading } = useGetMe({ query: { enabled: !!user, queryKey: getGetMeQueryKey() } });
  const hasAdminRole = me?.role === "admin" || me?.role === "super_admin" || me?.role === "moderator";
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const isAdmin = hasAdminRole && ADMIN_EMAILS.includes(userEmail);

  const { data: stats, isLoading: statsLoading } = useGetAnalyticsSummary({ query: { enabled: isAdmin, queryKey: getGetAnalyticsSummaryQueryKey() } });
  const { data: topMapsData } = useGetTopMaps({ query: { enabled: isAdmin, queryKey: getGetTopMapsQueryKey() } });
  const { data: topCreatorsData } = useGetTopCreators({ query: { enabled: isAdmin, queryKey: getGetTopCreatorsQueryKey() } });
  const { data: activityLogs, isLoading: logsLoading } = useGetActivityLogs({ query: { enabled: isAdmin, queryKey: getGetActivityLogsQueryKey() } });

  const { data: submissionsData, isLoading: submissionsLoading } = useListSubmissions(
    { status: "pending" },
    { query: { enabled: isAdmin, queryKey: getListSubmissionsQueryKey({ status: "pending" }) } }
  );

  const { data: reportsData, isLoading: reportsLoading } = useListReports(
    { status: "pending" },
    { query: { enabled: isAdmin, queryKey: getListReportsQueryKey({ status: "pending" }) } }
  );

  const { data: mapsData, isLoading: mapsLoading } = useListMaps(
    { search: mapSearch, limit: 20 },
    { query: { enabled: isAdmin, queryKey: getListMapsQueryKey({ search: mapSearch, limit: 20 }) } }
  );

  const { data: creatorsData, isLoading: creatorsLoading } = useListCreators(
    { search: creatorSearch },
    { query: { enabled: isAdmin, queryKey: getListCreatorsQueryKey({ search: creatorSearch }) } }
  );

  const { data: creatorAppsData, isLoading: creatorAppsLoading } = useListCreatorApplications(
    undefined,
    { enabled: isAdmin, queryKey: getListCreatorApplicationsQueryKey() }
  );

  const approveMutation = useApproveSubmission();
  const rejectMutation = useRejectSubmission();
  const resolveReportMutation = useResolveReport();
  const dismissReportMutation = useDismissReport();
  const deleteMapMutation = useDeleteMap();
  const updateMapMutation = useUpdateMap();
  const deleteCreatorMutation = useDeleteCreator();
  const adjustLikesMutation = useAdjustMapLikes();
  const approveCreatorAppMutation = useApproveCreatorApplication();
  const rejectCreatorAppMutation = useRejectCreatorApplication();

  // Pending edits — fetched via raw fetch since not in generated client
  const [pendingCreatorEdits, setPendingCreatorEdits] = React.useState<PendingCreatorEdit[]>([]);
  const [pendingMapEdits, setPendingMapEdits] = React.useState<PendingMapEdit[]>([]);
  const [editProcessingId, setEditProcessingId] = React.useState<number | null>(null);

  const fetchPendingEdits = React.useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [ce, me2] = await Promise.all([
        fetch("/api/creators/pending-edits", { credentials: "include" }).then((r) => r.ok ? r.json() : []),
        fetch("/api/maps/pending-edits", { credentials: "include" }).then((r) => r.ok ? r.json() : []),
      ]);
      setPendingCreatorEdits(ce);
      setPendingMapEdits(me2);
    } catch { /* ignore */ }
  }, [isAdmin]);

  React.useEffect(() => { fetchPendingEdits(); }, [fetchPendingEdits]);

  const handleCreatorEditApprove = async (id: number) => {
    setEditProcessingId(id);
    try {
      await fetch(`/api/creators/${id}/approve-edit`, { method: "POST", credentials: "include" });
      toast.success("Creator edit approved and published");
      fetchPendingEdits();
      queryClient.invalidateQueries({ queryKey: getListCreatorsQueryKey() });
    } catch { toast.error("Failed to approve edit"); } finally { setEditProcessingId(null); }
  };

  const handleCreatorEditReject = async (id: number) => {
    setEditProcessingId(id);
    try {
      await fetch(`/api/creators/${id}/reject-edit`, { method: "POST", credentials: "include" });
      toast.success("Creator edit rejected");
      fetchPendingEdits();
    } catch { toast.error("Failed to reject edit"); } finally { setEditProcessingId(null); }
  };

  const handleMapEditApprove = async (id: number) => {
    setEditProcessingId(id);
    try {
      await fetch(`/api/maps/${id}/approve-edit`, { method: "POST", credentials: "include" });
      toast.success("Map edit approved and published");
      fetchPendingEdits();
      queryClient.invalidateQueries({ queryKey: getListMapsQueryKey() });
    } catch { toast.error("Failed to approve edit"); } finally { setEditProcessingId(null); }
  };

  const handleMapEditReject = async (id: number) => {
    setEditProcessingId(id);
    try {
      await fetch(`/api/maps/${id}/reject-edit`, { method: "POST", credentials: "include" });
      toast.success("Map edit rejected");
      fetchPendingEdits();
    } catch { toast.error("Failed to reject edit"); } finally { setEditProcessingId(null); }
  };

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: getListMapsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListCreatorsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTopMapsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTopCreatorsQueryKey() });
  }

  // ── Bulk reject submissions ──
  const handleBulkRejectSubs = async () => {
    if (selectedSubIds.size === 0) return;
    setBulkActionPending(true);
    try {
      const res = await fetch("/api/submissions/bulk-reject", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedSubIds), reason: bulkSubReason || "Spam" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success(`Bulk Rejected ${data.updated} submissions`);
      setSelectedSubIds(new Set());
      setShowBulkSubDialog(false);
      queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey() });
    } catch { toast.error("Bulk reject failed"); } finally { setBulkActionPending(false); }
  };

  const handleClearPendingSubs = async () => {
    if (!window.confirm("Delete ALL pending map submissions? This cannot be undone.")) return;
    setBulkActionPending(true);
    try {
      const res = await fetch("/api/submissions/pending-clear", { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success(`Cleared ${data.deleted} pending submissions`);
      setSelectedSubIds(new Set());
      queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey() });
    } catch { toast.error("Failed to clear pending submissions"); } finally { setBulkActionPending(false); }
  };

  // ── Bulk reject creator apps ──
  const handleBulkRejectApps = async () => {
    if (selectedAppIds.size === 0) return;
    setBulkActionPending(true);
    try {
      const res = await fetch("/api/creator-applications/bulk-reject", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedAppIds), reason: bulkAppReason || "Spam" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success(`Bulk Rejected ${data.updated} applications`);
      setSelectedAppIds(new Set());
      setShowBulkAppDialog(false);
      queryClient.invalidateQueries({ queryKey: getListCreatorApplicationsQueryKey() });
    } catch { toast.error("Bulk reject failed"); } finally { setBulkActionPending(false); }
  };

  const handleClearPendingApps = async () => {
    if (!window.confirm("Delete ALL pending creator applications? This cannot be undone.")) return;
    setBulkActionPending(true);
    try {
      const res = await fetch("/api/creator-applications/pending-clear", { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success(`Cleared ${data.deleted} pending applications`);
      setSelectedAppIds(new Set());
      queryClient.invalidateQueries({ queryKey: getListCreatorApplicationsQueryKey() });
    } catch { toast.error("Failed to clear pending applications"); } finally { setBulkActionPending(false); }
  };

  // ── Ban user ──
  const handleBanUser = async (userId: string, display: string) => {
    if (!window.confirm(`PERMANENTLY ban "${display}"? This deletes their account, all submissions, creator profile, and maps. CANNOT be undone.`)) return;
    try {
      const res = await fetch(`/api/users/${userId}/ban`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`User "${display}" banned and removed`);
      queryClient.invalidateQueries({ queryKey: getListCreatorsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey() });
    } catch { toast.error("Failed to ban user"); }
  };

  const handleAdjustViews = async (mapId: number) => {
    const delta = parseInt(viewDelta[mapId] ?? "0", 10);
    if (isNaN(delta) || delta === 0) return;
    try {
      const res = await fetch(`/api/maps/${mapId}/adjust-views`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Views ${delta > 0 ? "increased" : "decreased"} by ${Math.abs(delta)}`);
      setViewDelta((prev) => ({ ...prev, [mapId]: "" }));
      invalidateAll();
    } catch {
      toast.error("Failed to adjust views");
    }
  };

  const handleApprove = (id: number) => {
    approveMutation.mutate({ id }, {
      onSuccess: () => {
        toast.success("Submission Approved", { description: "Map has been published." });
        queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey() });
      },
    });
  };

  const handleReject = () => {
    if (!rejectId) return;
    rejectMutation.mutate({ id: rejectId, data: { reason: rejectReason } }, {
      onSuccess: () => {
        toast.success("Submission Rejected");
        setRejectId(null);
        setRejectReason("");
        queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() });
      },
    });
  };

  const handleResolveReport = (id: number) => {
    resolveReportMutation.mutate({ id }, {
      onSuccess: () => {
        toast.success("Report Resolved");
        queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey() });
      },
    });
  };

  const handleDismissReport = (id: number) => {
    dismissReportMutation.mutate({ id }, {
      onSuccess: () => {
        toast.success("Report Dismissed");
        queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey() });
      },
    });
  };

  const handleDeleteMap = (id: number) => {
    if (!window.confirm("Delete this map? This cannot be undone.")) return;
    deleteMapMutation.mutate({ id }, {
      onSuccess: () => {
        toast.success("Map Deleted");
        invalidateAll();
      },
    });
  };

  const handleOpenEditMap = (m: MapType) => {
    setEditMap(m);
    setEditMapName(m.name);
    setEditMapCode(m.code);
    setEditMapRegion(m.region);
    setEditMapFeatured(m.isFeatured);
    setEditMapTrending(m.isTrending);
  };

  const handleSaveMap = () => {
    if (!editMap) return;
    updateMapMutation.mutate(
      {
        id: editMap.id,
        data: {
          name: editMapName,
          code: editMapCode,
          region: editMapRegion,
          isFeatured: editMapFeatured,
          isTrending: editMapTrending,
        },
      },
      {
        onSuccess: () => {
          toast.success("Map Updated");
          setEditMap(null);
          invalidateAll();
        },
      }
    );
  };

  const handleAdjustLikes = (mapId: number) => {
    const delta = parseInt(likeDelta[mapId] ?? "0", 10);
    if (isNaN(delta) || delta === 0) return;
    adjustLikesMutation.mutate({ id: mapId, data: { delta } }, {
      onSuccess: () => {
        toast.success(`Likes ${delta > 0 ? "increased" : "decreased"} by ${Math.abs(delta)}`);
        setLikeDelta((prev) => ({ ...prev, [mapId]: "" }));
        invalidateAll();
      },
    });
  };

  const handleDeleteCreator = (id: number) => {
    if (!window.confirm("Delete this creator? This cannot be undone.")) return;
    deleteCreatorMutation.mutate({ id }, {
      onSuccess: () => {
        toast.success("Creator Deleted");
        queryClient.invalidateQueries({ queryKey: getListCreatorsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey() });
      },
    });
  };

  const handleFollowerBoost = async (creatorId: number, creatorName: string) => {
    const raw = followerBoostInput[creatorId];
    const boost = parseInt(raw, 10);
    if (isNaN(boost)) {
      toast.error("Invalid value", { description: "Enter a whole number (can be negative to decrease)." });
      return;
    }
    setFollowerBoostPending(creatorId);
    try {
      const res = await fetch(`/api/creators/${creatorId}/follower-boost`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boost }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success("Followers Updated ✅", {
        description: `${creatorName} now shows ${data.followersCount.toLocaleString()} followers.`,
      });
      queryClient.invalidateQueries({ queryKey: getListCreatorsQueryKey() });
      setFollowerBoostInput((prev) => ({ ...prev, [creatorId]: "" }));
    } catch {
      toast.error("Failed to update followers");
    } finally {
      setFollowerBoostPending(null);
    }
  };

  const handleTogglePin = (m: MapType) => {
    updateMapMutation.mutate(
      { id: m.id, data: { isPinned: !m.isPinned } },
      {
        onSuccess: () => {
          toast.success(m.isPinned ? "Map Unpinned" : "Map Pinned to Top");
          invalidateAll();
        },
      }
    );
  };

  const handleToggleFeatured = (m: MapType) => {
    updateMapMutation.mutate(
      { id: m.id, data: { isFeatured: !m.isFeatured } },
      {
        onSuccess: () => {
          toast.success(m.isFeatured ? "Removed from Featured" : "⭐ Added to Featured");
          invalidateAll();
        },
      }
    );
  };

  const handleToggleTrending = (m: MapType) => {
    updateMapMutation.mutate(
      { id: m.id, data: { isTrending: !m.isTrending } },
      {
        onSuccess: () => {
          toast.success(m.isTrending ? "Removed from Trending" : "🔥 Added to Trending");
          invalidateAll();
        },
      }
    );
  };

  const handleToggleMapVerified = (m: MapType) => {
    updateMapMutation.mutate(
      { id: m.id, data: { isVerified: !(m as MapType & { isVerified?: boolean }).isVerified } },
      {
        onSuccess: () => {
          toast.success((m as MapType & { isVerified?: boolean }).isVerified ? "Verified badge removed" : "✅ Map Verified");
          invalidateAll();
        },
      }
    );
  };

  const handleToggleCreatorVerified = async (creator: Creator) => {
    try {
      const res = await fetch(`/api/creators/${creator.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !creator.isVerified }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(creator.isVerified ? "Verified badge removed" : `✅ ${creator.name} is now Verified`);
      queryClient.invalidateQueries({ queryKey: getListCreatorsQueryKey() });
    } catch {
      toast.error("Failed to update verified status");
    }
  };

  const handleApproveCreatorApp = (id: number) => {
    approveCreatorAppMutation.mutate({ id }, {
      onSuccess: () => {
        toast.success("Creator Application Approved");
        queryClient.invalidateQueries({ queryKey: getListCreatorApplicationsQueryKey() });
      },
    });
  };

  const handleRejectCreatorApp = () => {
    if (rejectAppId === null) return;
    rejectCreatorAppMutation.mutate({ id: rejectAppId, data: { reason: rejectAppReason } }, {
      onSuccess: () => {
        toast.success("Creator Application Rejected");
        setRejectAppId(null);
        setRejectAppReason("");
        queryClient.invalidateQueries({ queryKey: getListCreatorApplicationsQueryKey() });
      },
    });
  };

  if (meLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center min-h-[80vh]">
        <Shield className="h-20 w-20 text-destructive mb-6" />
        <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
        <p className="text-xl text-muted-foreground mb-8">You do not have permission to view this page.</p>
        <Button onClick={() => setLocation("/")} size="lg">Return to Home</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-muted/10">
      <div className="bg-card border-b border-border/40 py-8 px-4">
        <div className="container max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <Badge className="ml-2 capitalize">{me?.role?.replace("_", " ")}</Badge>
          </div>
          <p className="text-muted-foreground">Manage the platform — submissions, reports, maps, creators, and analytics.</p>
        </div>
      </div>

      <div className="container max-w-screen-xl mx-auto py-8 px-4 flex-1">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Maps" value={stats?.totalMaps} icon={<Map className="h-4 w-4 text-primary" />} loading={statsLoading} />
          <StatCard title="Total Creators" value={stats?.totalCreators} icon={<Users className="h-4 w-4 text-accent" />} loading={statsLoading} />
          <StatCard title="Pending Submissions" value={stats?.pendingSubmissions} icon={<FileText className="h-4 w-4 text-secondary" />} loading={statsLoading} />
          <StatCard title="Pending Reports" value={stats?.pendingReports} icon={<AlertTriangle className="h-4 w-4 text-destructive" />} loading={statsLoading} />
          <StatCard title="Total Likes" value={stats?.totalLikes} icon={<Heart className="h-4 w-4 text-primary" />} loading={statsLoading} />
          <StatCard title="Total Views" value={stats?.totalViews} icon={<Eye className="h-4 w-4 text-accent" />} loading={statsLoading} />
          <StatCard title="Total Users" value={stats?.totalUsers} icon={<Users className="h-4 w-4 text-secondary" />} loading={statsLoading} />
          <StatCard title="Total Submissions" value={stats?.totalSubmissions} icon={<FileText className="h-4 w-4 text-muted-foreground" />} loading={statsLoading} />
        </div>

        <Tabs defaultValue="submissions" className="w-full">
          <TabsList className="mb-8 bg-card border border-border/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="submissions">
              Submissions {stats?.pendingSubmissions ? <Badge variant="destructive" className="ml-1 h-5 px-1 text-xs">{stats.pendingSubmissions}</Badge> : null}
            </TabsTrigger>
            <TabsTrigger value="reports">
              Reports {stats?.pendingReports ? <Badge variant="destructive" className="ml-1 h-5 px-1 text-xs">{stats.pendingReports}</Badge> : null}
            </TabsTrigger>
            <TabsTrigger value="maps">Maps</TabsTrigger>
            <TabsTrigger value="creators">Creators</TabsTrigger>
            <TabsTrigger value="creator-apps">
              Creator Apps {creatorAppsData && creatorAppsData.filter((a: CreatorApplication) => a.status === "pending").length > 0 ? (
                <Badge variant="destructive" className="ml-1 h-5 px-1 text-xs">{creatorAppsData.filter((a: CreatorApplication) => a.status === "pending").length}</Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
            <TabsTrigger value="profile-edits">
              Profile Edits {pendingCreatorEdits.length > 0 ? <Badge variant="destructive" className="ml-1 h-5 px-1 text-xs">{pendingCreatorEdits.length}</Badge> : null}
            </TabsTrigger>
            <TabsTrigger value="map-edits">
              Map Edits {pendingMapEdits.length > 0 ? <Badge variant="destructive" className="ml-1 h-5 px-1 text-xs">{pendingMapEdits.length}</Badge> : null}
            </TabsTrigger>
          </TabsList>

          {/* Submissions */}
          <TabsContent value="submissions" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Pending Map Submissions</h2>
              {submissionsData && submissionsData.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs"
                    onClick={() => {
                      const allIds = submissionsData.map((s: Submission) => s.id);
                      setSelectedSubIds(selectedSubIds.size === allIds.length ? new Set() : new Set(allIds));
                    }}
                  >
                    <ListChecks className="h-3.5 w-3.5" />
                    {selectedSubIds.size === submissionsData.length ? "Deselect All" : "Select All"}
                  </Button>
                  {selectedSubIds.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2 text-xs"
                      onClick={() => setShowBulkSubDialog(true)}
                      disabled={bulkActionPending}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Bulk Reject ({selectedSubIds.size})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={handleClearPendingSubs}
                    disabled={bulkActionPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear All Pending
                  </Button>
                </div>
              )}
            </div>

            {/* Bulk Reject Dialog — Submissions */}
            <Dialog open={showBulkSubDialog} onOpenChange={(open) => !open && setShowBulkSubDialog(false)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Reject {selectedSubIds.size} Submission{selectedSubIds.size !== 1 ? "s" : ""}</DialogTitle>
                  <DialogDescription>A single reason will be sent to all selected submitters.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="bulkSubReason">Rejection Reason</Label>
                  <Input
                    id="bulkSubReason"
                    value={bulkSubReason}
                    onChange={(e) => setBulkSubReason(e.target.value)}
                    placeholder="e.g. Spam, Invalid code..."
                    className="mt-2"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowBulkSubDialog(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleBulkRejectSubs} disabled={bulkActionPending}>
                    Confirm Bulk Reject
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {submissionsLoading ? (
              <div className="space-y-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
            ) : submissionsData && submissionsData.length > 0 ? (
              <div className="grid gap-4">
                {submissionsData.map((sub: Submission) => (
                  <Card key={sub.id} className={selectedSubIds.has(sub.id) ? "border-destructive/50 bg-destructive/5" : ""}>
                    <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                      {/* Checkbox */}
                      <Checkbox
                        checked={selectedSubIds.has(sub.id)}
                        onCheckedChange={(checked) => {
                          setSelectedSubIds((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(sub.id); else next.delete(sub.id);
                            return next;
                          });
                        }}
                        className="mt-1 shrink-0"
                      />
                      <div className="w-32 h-20 bg-muted rounded-md overflow-hidden shrink-0">
                        {sub.image ? (
                          <img src={sub.image} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Image</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{sub.mapName ?? "Unnamed Map"}</h3>
                          <Badge variant="outline">{sub.region}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-2">
                          <span>Code: <span className="font-mono text-primary">{sub.mapCode}</span></span>
                          <span>Creator: {sub.creatorName}</span>
                        </div>
                        {sub.mapLink && (
                          <a href={sub.mapLink} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">
                            View Map Link
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <Button
                          variant="outline"
                          className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 flex-1 md:flex-none"
                          onClick={() => handleApprove(sub.id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                        </Button>
                        <Dialog open={rejectId === sub.id} onOpenChange={(open) => !open && setRejectId(null)}>
                          <Button
                            variant="outline"
                            className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 flex-1 md:flex-none"
                            onClick={() => setRejectId(sub.id)}
                          >
                            <XCircle className="mr-2 h-4 w-4" /> Reject
                          </Button>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Submission</DialogTitle>
                              <DialogDescription>Provide a reason for rejecting — the creator will see this.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <Label htmlFor="reason">Rejection Reason</Label>
                              <Textarea
                                id="reason"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="e.g. Invalid map code, inappropriate content..."
                                className="mt-2"
                              />
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
                              <Button variant="destructive" onClick={handleReject} disabled={!rejectReason || rejectMutation.isPending}>
                                Confirm Rejection
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">All Caught Up!</h3>
                <p className="text-muted-foreground">No pending submissions to review.</p>
              </div>
            )}
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports" className="space-y-4">
            <h2 className="text-xl font-bold">Pending Reports</h2>
            {reportsLoading ? (
              <div className="space-y-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
            ) : reportsData && reportsData.length > 0 ? (
              <div className="grid gap-4">
                {reportsData.map((report: Report) => (
                  <Card key={report.id} className="border-destructive/20">
                    <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          <h3 className="font-bold">{report.mapName ?? `Map #${report.mapId}`}</h3>
                          <Badge variant="outline" className="text-destructive border-destructive/50 capitalize">
                            {report.reason.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mt-2">{report.description ?? "No description provided."}</p>
                        <Link href={`/map/${report.mapId}`} className="text-sm text-primary hover:underline flex items-center gap-1 mt-2">
                          <Eye className="h-3 w-3" /> View Map
                        </Link>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <Button
                          variant="outline"
                          className="flex-1 md:flex-none"
                          onClick={() => handleResolveReport(report.id)}
                          disabled={resolveReportMutation.isPending}
                        >
                          Resolve
                        </Button>
                        <Button
                          variant="ghost"
                          className="flex-1 md:flex-none text-muted-foreground"
                          onClick={() => handleDismissReport(report.id)}
                          disabled={dismissReportMutation.isPending}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Pending Reports</h3>
                <p className="text-muted-foreground">Everything looks clean.</p>
              </div>
            )}
          </TabsContent>

          {/* Maps Management */}
          <TabsContent value="maps" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Map Management</h2>
            </div>
            <div className="flex gap-4 mb-4">
              <Input
                placeholder="Search maps..."
                value={mapSearch}
                onChange={(e) => setMapSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
            {mapsLoading ? (
              <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : mapsData?.maps && mapsData.maps.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-semibold">Map</th>
                      <th className="text-left p-3 font-semibold">Code</th>
                      <th className="text-left p-3 font-semibold">Region</th>
                      <th className="text-left p-3 font-semibold">Likes</th>
                      <th className="text-left p-3 font-semibold">Views</th>
                      <th className="text-left p-3 font-semibold">Badges</th>
                      <th className="text-left p-3 font-semibold">Adjust Likes</th>
                      <th className="text-left p-3 font-semibold">Adjust Views</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                      <th className="text-right p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapsData.maps.map((m: MapType) => (
                      <tr key={m.id} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-medium max-w-[180px] truncate">{m.name}</td>
                        <td className="p-3 font-mono text-primary">{m.code}</td>
                        <td className="p-3 text-muted-foreground">{m.region}</td>
                        <td className="p-3">{m.likes.toLocaleString()}</td>
                        <td className="p-3">{m.views.toLocaleString()}</td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {m.isFeatured && <Badge className="text-xs">Featured</Badge>}
                            {m.isTrending && <Badge variant="secondary" className="text-xs">Trending</Badge>}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setLikeDelta((prev) => ({ ...prev, [m.id]: String(Math.max(-999, parseInt(prev[m.id] ?? "10", 10) - 10)) }));
                              }}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              className="w-16 h-7 text-center text-xs"
                              value={likeDelta[m.id] ?? ""}
                              onChange={(e) => setLikeDelta((prev) => ({ ...prev, [m.id]: e.target.value }))}
                              placeholder="±"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setLikeDelta((prev) => ({ ...prev, [m.id]: String(parseInt(prev[m.id] ?? "0", 10) + 10) }));
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleAdjustLikes(m.id)}
                              disabled={!likeDelta[m.id] || adjustLikesMutation.isPending}
                            >
                              Apply
                            </Button>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setViewDelta((prev) => ({ ...prev, [m.id]: String(Math.max(-999, parseInt(prev[m.id] ?? "10", 10) - 10)) }))}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              className="w-16 h-7 text-center text-xs"
                              value={viewDelta[m.id] ?? ""}
                              onChange={(e) => setViewDelta((prev) => ({ ...prev, [m.id]: e.target.value }))}
                              placeholder="±"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setViewDelta((prev) => ({ ...prev, [m.id]: String(parseInt(prev[m.id] ?? "0", 10) + 10) }))}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleAdjustViews(m.id)}
                              disabled={!viewDelta[m.id]}
                            >
                              Apply
                            </Button>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${m.isFeatured ? "text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20" : "opacity-40 hover:opacity-100"}`}
                              onClick={() => handleToggleFeatured(m)}
                              disabled={updateMapMutation.isPending}
                              title={m.isFeatured ? "Remove from Featured" : "Mark as Featured"}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${m.isTrending ? "text-orange-400 bg-orange-400/10 hover:bg-orange-400/20" : "opacity-40 hover:opacity-100"}`}
                              onClick={() => handleToggleTrending(m)}
                              disabled={updateMapMutation.isPending}
                              title={m.isTrending ? "Remove from Trending" : "Mark as Trending"}
                            >
                              <TrendingUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${m.isPinned ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20" : "opacity-40 hover:opacity-100"}`}
                              onClick={() => handleTogglePin(m)}
                              disabled={updateMapMutation.isPending}
                              title={m.isPinned ? "Unpin map" : "Pin map to top"}
                            >
                              {m.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${(m as MapType & { isVerified?: boolean }).isVerified ? "text-blue-400 bg-blue-400/10 hover:bg-blue-400/20" : "opacity-40 hover:opacity-100"}`}
                              onClick={() => handleToggleMapVerified(m)}
                              disabled={updateMapMutation.isPending}
                              title={(m as MapType & { isVerified?: boolean }).isVerified ? "Remove Verified badge" : "Mark as Verified"}
                            >
                              <BadgeCheck className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditMap(m)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteMap(m.id)}
                              disabled={deleteMapMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center border border-dashed rounded-xl text-muted-foreground">
                No maps found.
              </div>
            )}
          </TabsContent>

          {/* Creator Management */}
          <TabsContent value="creators" className="space-y-4">
            <h2 className="text-xl font-bold">Creator Management</h2>
            <div className="flex gap-4 mb-4">
              <Input
                placeholder="Search creators..."
                value={creatorSearch}
                onChange={(e) => setCreatorSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
            {creatorsLoading ? (
              <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : creatorsData && creatorsData.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-semibold">Creator</th>
                      <th className="text-left p-3 font-semibold">Region</th>
                      <th className="text-left p-3 font-semibold">Maps</th>
                      <th className="text-left p-3 font-semibold">Likes</th>
                      <th className="text-left p-3 font-semibold">Followers</th>
                      <th className="text-left p-3 font-semibold">Update Followers</th>
                      <th className="text-left p-3 font-semibold">Verified</th>
                      <th className="text-right p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creatorsData.map((creator: Creator) => (
                      <tr key={creator.id} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {creator.logo ? (
                              <img src={creator.logo} alt={creator.name} className="h-8 w-8 rounded-full object-cover border border-border/50" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                {creator.name[0]}
                              </div>
                            )}
                            <span className="font-medium">{creator.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">{creator.region ?? "—"}</td>
                        <td className="p-3">{creator.totalMaps}</td>
                        <td className="p-3">{creator.totalLikes.toLocaleString()}</td>
                        <td className="p-3 font-semibold text-primary">
                          {(creator.followerBoost ?? 0).toLocaleString()}
                          <span className="text-xs text-muted-foreground font-normal ml-1">boost</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Input
                              className="w-24 h-7 text-center text-xs border-primary/40 focus:border-primary"
                              value={followerBoostInput[creator.id] ?? ""}
                              onChange={(e) => setFollowerBoostInput((prev) => ({ ...prev, [creator.id]: e.target.value }))}
                              placeholder="±e.g. -50"
                              type="number"
                            />
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-primary hover:bg-primary/90 text-white px-3 shadow-sm shadow-primary/20"
                              onClick={() => handleFollowerBoost(creator.id, creator.name)}
                              disabled={followerBoostPending === creator.id || !followerBoostInput[creator.id]}
                            >
                              {followerBoostPending === creator.id ? "…" : "Set"}
                            </Button>
                          </div>
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${creator.isVerified ? "text-blue-400 bg-blue-400/10 hover:bg-blue-400/20" : "opacity-40 hover:opacity-100"}`}
                            onClick={() => handleToggleCreatorVerified(creator)}
                            title={creator.isVerified ? "Remove Verified badge" : "Grant Verified badge"}
                          >
                            <BadgeCheck className="h-4 w-4" />
                          </Button>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/creator/${creator.id}`}>
                                <Eye className="h-4 w-4 mr-1" /> View
                              </Link>
                            </Button>
                            {(creator as Creator & { userId?: string }).userId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                                title="Ban user & delete all their data"
                                onClick={() => handleBanUser((creator as Creator & { userId?: string }).userId!, creator.name)}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteCreator(creator.id)}
                              disabled={deleteCreatorMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center border border-dashed rounded-xl text-muted-foreground">
                No creators found.
              </div>
            )}
          </TabsContent>

          {/* Creator Applications */}
          <TabsContent value="creator-apps" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Creator Applications</h2>
              {creatorAppsData && creatorAppsData.filter((a: CreatorApplication) => a.status === "pending").length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs"
                    onClick={() => {
                      const pendingIds = creatorAppsData.filter((a: CreatorApplication) => a.status === "pending").map((a: CreatorApplication) => a.id);
                      setSelectedAppIds(selectedAppIds.size === pendingIds.length ? new Set() : new Set(pendingIds));
                    }}
                  >
                    <ListChecks className="h-3.5 w-3.5" />
                    {selectedAppIds.size === creatorAppsData.filter((a: CreatorApplication) => a.status === "pending").length ? "Deselect All" : "Select All Pending"}
                  </Button>
                  {selectedAppIds.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2 text-xs"
                      onClick={() => setShowBulkAppDialog(true)}
                      disabled={bulkActionPending}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Bulk Reject ({selectedAppIds.size})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={handleClearPendingApps}
                    disabled={bulkActionPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear All Pending
                  </Button>
                </div>
              )}
            </div>

            {/* Bulk Reject Dialog — Creator Apps */}
            <Dialog open={showBulkAppDialog} onOpenChange={(open) => !open && setShowBulkAppDialog(false)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Reject {selectedAppIds.size} Application{selectedAppIds.size !== 1 ? "s" : ""}</DialogTitle>
                  <DialogDescription>A single reason will be sent to all selected applicants.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="bulkAppReason">Rejection Reason</Label>
                  <Input
                    id="bulkAppReason"
                    value={bulkAppReason}
                    onChange={(e) => setBulkAppReason(e.target.value)}
                    placeholder="e.g. Spam, Incomplete application..."
                    className="mt-2"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowBulkAppDialog(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleBulkRejectApps} disabled={bulkActionPending}>
                    Confirm Bulk Reject
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {creatorAppsLoading ? (
              <div className="space-y-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
            ) : creatorAppsData && creatorAppsData.length > 0 ? (
              <div className="grid gap-4">
                {creatorAppsData.map((app: CreatorApplication) => (
                  <Card key={app.id} className={`border-l-4 ${selectedAppIds.has(app.id) ? "border-l-destructive bg-destructive/5" : app.status === "pending" ? "border-l-amber-500" : app.status === "approved" ? "border-l-green-500" : "border-l-destructive"}`}>
                    <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                      {app.status === "pending" && (
                        <Checkbox
                          checked={selectedAppIds.has(app.id)}
                          onCheckedChange={(checked) => {
                            setSelectedAppIds((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(app.id); else next.delete(app.id);
                              return next;
                            });
                          }}
                          className="mt-1 shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-lg">{app.inGameName}</h3>
                          <Badge variant={app.status === "pending" ? "outline" : app.status === "approved" ? "default" : "destructive"} className="capitalize">
                            {app.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">Region:</span> {app.region}
                        </p>
                        {app.bio && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{app.bio}</p>
                        )}
                        {app.socialLink && (
                          <a href={app.socialLink} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline mt-1 block">
                            Social / Portfolio Link
                          </a>
                        )}
                        {app.rejectionReason && (
                          <p className="text-sm text-destructive mt-2">
                            <span className="font-medium">Rejected:</span> {app.rejectionReason}
                          </p>
                        )}
                      </div>
                      {app.status === "pending" && (
                        <div className="flex gap-2 w-full md:w-auto">
                          <Button
                            variant="outline"
                            className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 flex-1 md:flex-none gap-2"
                            onClick={() => handleApproveCreatorApp(app.id)}
                            disabled={approveCreatorAppMutation.isPending}
                          >
                            <UserCheck className="h-4 w-4" /> Approve
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 flex-1 md:flex-none gap-2"
                            onClick={() => { setRejectAppId(app.id); setRejectAppReason(""); }}
                          >
                            <UserX className="h-4 w-4" /> Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
                <UserCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Applications</h3>
                <p className="text-muted-foreground">No creator applications have been submitted yet.</p>
              </div>
            )}
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-xl font-bold">Platform Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" /> Top Maps by Views
                  </CardTitle>
                  <CardDescription>Most-viewed maps on the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  {topMapsData ? (
                    <SimpleBar items={topMapsData} valueKey="views" nameKey="name" />
                  ) : (
                    <div className="space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-destructive" /> Top Maps by Likes
                  </CardTitle>
                  <CardDescription>Most-liked maps on the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  {topMapsData ? (
                    <SimpleBar items={topMapsData} valueKey="likes" nameKey="name" />
                  ) : (
                    <div className="space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-secondary" /> Top Creators by Likes
                  </CardTitle>
                  <CardDescription>Creators with the most likes</CardDescription>
                </CardHeader>
                <CardContent>
                  {topCreatorsData ? (
                    <SimpleBar items={topCreatorsData} valueKey="totalLikes" nameKey="name" />
                  ) : (
                    <div className="space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5 text-accent" /> Top Creators by Maps
                  </CardTitle>
                  <CardDescription>Creators with the most published maps</CardDescription>
                </CardHeader>
                <CardContent>
                  {topCreatorsData ? (
                    <SimpleBar items={topCreatorsData} valueKey="totalMaps" nameKey="name" />
                  ) : (
                    <div className="space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Logs */}
          <TabsContent value="activity" className="space-y-4">
            <h2 className="text-xl font-bold">Activity Log</h2>
            {logsLoading ? (
              <div className="space-y-3">{Array(10).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : activityLogs && activityLogs.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-semibold">Time</th>
                      <th className="text-left p-3 font-semibold">Admin</th>
                      <th className="text-left p-3 font-semibold">Action</th>
                      <th className="text-left p-3 font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.map((log: ActivityLog) => (
                      <tr key={log.id} className="border-t border-border/30 hover:bg-muted/10 transition-colors">
                        <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="p-3 font-medium">{log.adminUsername ?? log.adminId.slice(0, 8) + "…"}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="capitalize text-xs">
                            {log.action.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{log.details ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center border border-dashed rounded-xl text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No activity recorded yet.</p>
              </div>
            )}
          </TabsContent>

          {/* Profile Edits */}
          <TabsContent value="profile-edits" className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              Pending Profile Edits
              {pendingCreatorEdits.length > 0 && <Badge variant="destructive">{pendingCreatorEdits.length}</Badge>}
            </h2>
            {pendingCreatorEdits.length === 0 ? (
              <div className="py-16 text-center border border-dashed rounded-xl text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No pending creator profile edits.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingCreatorEdits.map((creator) => {
                  const pending = (() => { try { return JSON.parse(creator.pendingEdit ?? "{}"); } catch { return {}; } })();
                  return (
                    <Card key={creator.id} className="bg-card/60 border-border/50">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          {(pending.logo || creator.logo) && (
                            <img src={pending.logo || creator.logo} alt="Logo" className="w-14 h-14 rounded-full object-cover shrink-0 border border-border" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-bold text-lg">{creator.name}</span>
                              <Badge variant="outline" className="text-amber-400 border-amber-400/40 text-xs">Pending Edit</Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm">
                              {pending.name && <div><span className="text-muted-foreground text-xs uppercase tracking-wide block mb-0.5">New Name</span><span className="font-medium">{pending.name}</span></div>}
                              {pending.bio !== undefined && <div><span className="text-muted-foreground text-xs uppercase tracking-wide block mb-0.5">New Bio</span><span className="line-clamp-2">{pending.bio || <em className="text-muted-foreground">Empty</em>}</span></div>}
                              {pending.socialLinks && <div className="sm:col-span-2"><span className="text-muted-foreground text-xs uppercase tracking-wide block mb-0.5">Social Links</span><pre className="text-xs bg-muted/50 rounded p-2 overflow-auto max-h-24">{JSON.stringify(pending.socialLinks, null, 2)}</pre></div>}
                            </div>
                            {pending.banner && (
                              <div className="mt-3">
                                <span className="text-muted-foreground text-xs uppercase tracking-wide block mb-1.5">New Banner</span>
                                <img src={pending.banner} alt="Banner" className="w-full max-w-sm h-20 object-cover rounded-lg border border-border" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4 justify-end">
                          <Button size="sm" variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" disabled={editProcessingId === creator.id} onClick={() => handleCreatorEditReject(creator.id)}>
                            <XCircle className="h-4 w-4 mr-1.5" /> Reject
                          </Button>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white" disabled={editProcessingId === creator.id} onClick={() => handleCreatorEditApprove(creator.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve & Publish
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Map Edits */}
          <TabsContent value="map-edits" className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              Pending Map Edits
              {pendingMapEdits.length > 0 && <Badge variant="destructive">{pendingMapEdits.length}</Badge>}
            </h2>
            {pendingMapEdits.length === 0 ? (
              <div className="py-16 text-center border border-dashed rounded-xl text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No pending map edits.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingMapEdits.map((map) => {
                  const pending = (() => { try { return JSON.parse(map.pendingEdit ?? "{}"); } catch { return {}; } })();
                  return (
                    <Card key={map.id} className="bg-card/60 border-border/50">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          {(pending.image || map.image) && (
                            <img src={pending.image || map.image} alt="Map" className="w-20 h-14 rounded-lg object-cover shrink-0 border border-border" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-bold text-lg">{map.name}</span>
                              {map.creatorName && <span className="text-sm text-muted-foreground">by {map.creatorName}</span>}
                              <Badge variant="outline" className="text-amber-400 border-amber-400/40 text-xs">Pending Edit</Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm">
                              {pending.name && <div><span className="text-muted-foreground text-xs uppercase tracking-wide block mb-0.5">New Name</span><span className="font-medium">{pending.name}</span></div>}
                              {pending.code && <div><span className="text-muted-foreground text-xs uppercase tracking-wide block mb-0.5">New Code</span><span className="font-mono font-medium">{pending.code}</span></div>}
                              {pending.region && <div><span className="text-muted-foreground text-xs uppercase tracking-wide block mb-0.5">New Region</span><span>{pending.region}</span></div>}
                              {pending.mapLink !== undefined && <div><span className="text-muted-foreground text-xs uppercase tracking-wide block mb-0.5">Map Link</span><span className="truncate block">{pending.mapLink || <em className="text-muted-foreground">Removed</em>}</span></div>}
                            </div>
                            {pending.image && pending.image !== map.image && (
                              <div className="mt-3">
                                <span className="text-muted-foreground text-xs uppercase tracking-wide block mb-1.5">New Cover Image</span>
                                <img src={pending.image} alt="New cover" className="w-32 h-20 object-cover rounded-lg border border-border" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4 justify-end">
                          <Button size="sm" variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" disabled={editProcessingId === map.id} onClick={() => handleMapEditReject(map.id)}>
                            <XCircle className="h-4 w-4 mr-1.5" /> Reject
                          </Button>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white" disabled={editProcessingId === map.id} onClick={() => handleMapEditApprove(map.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve & Publish
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Map Dialog */}
      <Dialog open={!!editMap} onOpenChange={(open) => !open && setEditMap(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Map</DialogTitle>
            <DialogDescription>Update map details. Changes take effect immediately.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={editMapName} onChange={(e) => setEditMapName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="edit-code">Map Code</Label>
              <Input id="edit-code" value={editMapCode} onChange={(e) => setEditMapCode(e.target.value)} className="mt-1 font-mono" />
            </div>
            <div>
              <Label htmlFor="edit-region">Region</Label>
              <Input id="edit-region" value={editMapRegion} onChange={(e) => setEditMapRegion(e.target.value)} className="mt-1" />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editMapFeatured}
                  onChange={(e) => setEditMapFeatured(e.target.checked)}
                  className="accent-primary w-4 h-4"
                />
                <span className="text-sm font-medium">Featured</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editMapTrending}
                  onChange={(e) => setEditMapTrending(e.target.checked)}
                  className="accent-primary w-4 h-4"
                />
                <span className="text-sm font-medium">Trending</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMap(null)}>Cancel</Button>
            <Button onClick={handleSaveMap} disabled={updateMapMutation.isPending}>
              {updateMapMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Creator Application Dialog */}
      <Dialog open={rejectAppId !== null} onOpenChange={(open) => !open && setRejectAppId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Creator Application</DialogTitle>
            <DialogDescription>Provide a reason so the applicant knows why they were not accepted.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-app-reason">Reason (optional)</Label>
            <Textarea
              id="reject-app-reason"
              className="mt-2"
              placeholder="e.g. Portfolio link was broken, not enough maps submitted…"
              value={rejectAppReason}
              onChange={(e) => setRejectAppReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectAppId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectCreatorApp} disabled={rejectCreatorAppMutation.isPending}>
              {rejectCreatorAppMutation.isPending ? "Rejecting..." : "Reject Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
