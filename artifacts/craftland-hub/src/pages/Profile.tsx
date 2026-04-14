import React from "react";
import { Show, useUser, useClerk } from "@clerk/react";
import { Link, useLocation } from "wouter";
import { 
  useGetMe, 
  useGetMyLikedMaps, 
  useGetMyBookmarkedMaps, 
  useGetMySubmissions,
  useGetMyFollowedCreators,
  getGetMeQueryKey,
  getGetMyLikedMapsQueryKey,
  getGetMyBookmarkedMapsQueryKey,
  getGetMySubmissionsQueryKey,
  getGetMyFollowedCreatorsQueryKey,
} from "@workspace/api-client-react";
import { MapCard } from "@/components/MapCard";
import { CreatorCard } from "@/components/CreatorCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Bookmark, History, Users, LogOut, FileText, LogIn, UserPlus } from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  const { data: me, isLoading: meLoading } = useGetMe({ query: { enabled: !!user, queryKey: getGetMeQueryKey() } });
  const { data: likedMaps, isLoading: likesLoading } = useGetMyLikedMaps({ query: { enabled: !!user, queryKey: getGetMyLikedMapsQueryKey() } });
  const { data: savedMaps, isLoading: savedLoading } = useGetMyBookmarkedMaps({ query: { enabled: !!user, queryKey: getGetMyBookmarkedMapsQueryKey() } });
  const { data: submissions, isLoading: submissionsLoading } = useGetMySubmissions({ query: { enabled: !!user, queryKey: getGetMySubmissionsQueryKey() } });
  const { data: followedCreators, isLoading: creatorsLoading } = useGetMyFollowedCreators({ query: { enabled: !!user, queryKey: getGetMyFollowedCreatorsQueryKey() } });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="badge-approved font-semibold">Approved</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">Pending Review</Badge>;
    }
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-muted/10">
      <Show when="signed-out">
        <div className="flex-1 flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="relative mb-6">
            <div className="h-20 w-20 rounded-full bg-card border border-white/10 flex items-center justify-center mx-auto shadow-xl">
              <LogIn className="h-9 w-9 text-primary" />
            </div>
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl mx-auto" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">Sign in to your account</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-8 leading-relaxed">
            Create a free account or sign in to view your profile, liked maps, saved maps, and submitted maps.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs mx-auto">
            <Button
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-semibold btn-glow rounded-xl gap-2"
              onClick={() => setLocation("/sign-in")}
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 border-white/12 hover:bg-white/6 rounded-xl gap-2 font-semibold"
              onClick={() => setLocation("/sign-up")}
            >
              <UserPlus className="h-4 w-4" />
              Sign Up
            </Button>
          </div>
        </div>
      </Show>

      <Show when="signed-in">
        {/* Header Profile */}
        <div className="bg-card border-b border-border/40 py-8 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 pointer-events-none" />
          
          <div className="container max-w-screen-xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="text-4xl bg-primary text-primary-foreground">{user?.firstName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold mb-1">{user?.fullName || "User"}</h1>
              <p className="text-muted-foreground mb-4">{user?.primaryEmailAddress?.emailAddress}</p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                {me?.role !== 'user' && (
                  <Badge variant="default" className="bg-primary">{me?.role.replace('_', ' ').toUpperCase()}</Badge>
                )}
                <Badge variant="outline">Member since {user?.createdAt ? format(new Date(user.createdAt), 'MMM yyyy') : 'Unknown'}</Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" className="text-destructive gap-2" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="container max-w-screen-xl mx-auto py-8 px-4 flex-1">
          <Tabs defaultValue="saved" className="w-full">
            <TabsList className="w-full flex justify-start h-auto p-1 bg-muted/50 overflow-x-auto overflow-y-hidden border border-border/50">
              <TabsTrigger value="saved" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                <Bookmark className="h-4 w-4 mr-2" /> Saved Maps
              </TabsTrigger>
              <TabsTrigger value="liked" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                <Heart className="h-4 w-4 mr-2" /> Liked Maps
              </TabsTrigger>
              <TabsTrigger value="submissions" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                <History className="h-4 w-4 mr-2" /> My Submissions
              </TabsTrigger>
              <TabsTrigger value="following" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                <Users className="h-4 w-4 mr-2" /> Following
              </TabsTrigger>
            </TabsList>

            <div className="mt-8">
              <TabsContent value="saved" className="m-0 focus-visible:outline-none">
                {savedLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="w-full aspect-[16/9] rounded-xl" />)}
                  </div>
                ) : savedMaps && savedMaps.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {savedMaps.map((map, idx) => <MapCard key={map.id} map={map} index={idx} />)}
                  </div>
                ) : (
                  <div className="py-20 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
                    <Bookmark className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">No saved maps</h3>
                    <p className="text-muted-foreground">You haven't bookmarked any maps yet.</p>
                    <Button variant="outline" className="mt-4" asChild><Link href="/explore">Explore Maps</Link></Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="liked" className="m-0 focus-visible:outline-none">
                {likesLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="w-full aspect-[16/9] rounded-xl" />)}
                  </div>
                ) : likedMaps && likedMaps.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {likedMaps.map((map, idx) => <MapCard key={map.id} map={map} index={idx} />)}
                  </div>
                ) : (
                  <div className="py-20 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
                    <Heart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">No liked maps</h3>
                    <p className="text-muted-foreground">Show some love to creators by liking their maps.</p>
                    <Button variant="outline" className="mt-4" asChild><Link href="/explore">Explore Maps</Link></Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="submissions" className="m-0 focus-visible:outline-none">
                <div className="mb-6 flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Submission History</h2>
                  <Button asChild><Link href="/submit">Submit New Map</Link></Button>
                </div>

                {submissionsLoading ? (
                  <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                  </div>
                ) : submissions && submissions.length > 0 ? (
                  <div className="space-y-4">
                    {submissions.map((sub) => (
                      <div key={sub.id} className="flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-border/50 bg-card">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg">{sub.mapName || sub.mapCode}</h3>
                            {getStatusBadge(sub.status)}
                          </div>
                          <p className="text-sm font-mono text-primary mb-2">{sub.mapCode}</p>
                          <div className="text-sm text-muted-foreground flex gap-4">
                            <span>Region: {sub.region}</span>
                            <span>Submitted: {format(new Date(sub.createdAt), 'MMM d, yyyy')}</span>
                          </div>
                          {sub.status === 'rejected' && sub.rejectionReason && (
                            <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm">
                              <span className="font-semibold text-destructive">Reason: </span>
                              {sub.rejectionReason}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
                    <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">No submissions yet</h3>
                    <p className="text-muted-foreground">You haven't submitted any maps for review.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="following" className="m-0 focus-visible:outline-none">
                {creatorsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
                  </div>
                ) : followedCreators && followedCreators.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {followedCreators.map((creator, idx) => <CreatorCard key={creator.id} creator={creator} index={idx} />)}
                  </div>
                ) : (
                  <div className="py-20 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
                    <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Not following anyone</h3>
                    <p className="text-muted-foreground">Follow creators to stay updated on their new maps.</p>
                    <Button variant="outline" className="mt-4" asChild><Link href="/creators">Find Creators</Link></Button>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </Show>
    </div>
  );
}
