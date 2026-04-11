import React from "react";
import { Link } from "wouter";
import { Show, useUser } from "@clerk/react";
import { useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Check, CheckCircle2, Map as MapIcon, Info, AlertCircle, BellRing } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function Notifications() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { permission, subscribe } = usePushNotifications();
  const [subscribing, setSubscribing] = React.useState(false);

  const handleEnablePush = async () => {
    setSubscribing(true);
    await subscribe();
    setSubscribing(false);
  };

  const { data: notifications, isLoading } = useListNotifications({ 
    query: { enabled: !!user, queryKey: getListNotificationsQueryKey() } 
  });

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const handleMarkRead = (id: number) => {
    markReadMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      }
    });
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      }
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'submission_approved': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'submission_rejected': return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'new_map': return <MapIcon className="h-5 w-5 text-primary" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="container max-w-screen-md mx-auto py-8 px-4 flex-1">
      <Show when="signed-out">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Sign in to view your notifications.</p>
        </div>
      </Show>

      <Show when="signed-in">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
          </h1>
          <div className="flex items-center gap-2">
            {permission !== "granted" && (
              <Button variant="outline" size="sm" onClick={handleEnablePush} disabled={subscribing || permission === "denied"} title={permission === "denied" ? "Push notifications blocked in browser settings" : "Enable browser push notifications"}>
                <BellRing className="mr-2 h-4 w-4" />
                {permission === "denied" ? "Push blocked" : "Enable Push"}
              </Button>
            )}
            {notifications && notifications.some(n => !n.isRead) && (
              <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markAllReadMutation.isPending}>
                <Check className="mr-2 h-4 w-4" /> Mark all as read
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 border border-border/50 rounded-xl">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))
          ) : notifications && notifications.length > 0 ? (
            notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`flex gap-4 p-4 border rounded-xl transition-colors ${notif.isRead ? 'bg-card border-border/50 opacity-70' : 'bg-card/80 border-primary/30 shadow-sm'}`}
              >
                <div className="mt-1 bg-background p-2 rounded-full border border-border/50 h-min">
                  {getIcon(notif.type)}
                </div>
                
                <div className="flex-1">
                  <h3 className={`font-bold ${!notif.isRead ? 'text-foreground' : 'text-foreground/80'}`}>
                    {notif.title}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-sm">{notif.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-2 font-medium">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </p>
                  
                  {notif.link && (
                    <Button variant="link" className="px-0 h-auto mt-2 text-primary" asChild>
                      <Link href={notif.link}>View Details</Link>
                    </Button>
                  )}
                </div>

                {!notif.isRead && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => handleMarkRead(notif.id)}
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          ) : (
            <div className="py-20 text-center border border-dashed border-border/50 rounded-xl bg-card/30">
              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">All caught up</h3>
              <p className="text-muted-foreground">You don't have any notifications right now.</p>
            </div>
          )}
        </div>
      </Show>
    </div>
  );
}
