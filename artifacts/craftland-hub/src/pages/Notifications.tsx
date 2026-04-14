import React from "react";
import { Link, useLocation } from "wouter";
import { Show, useUser } from "@clerk/react";
import { useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Check, CheckCircle2, Map as MapIcon, Info, AlertCircle, BellRing, LogIn, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { motion, AnimatePresence } from "framer-motion";

export default function Notifications() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { permission, subscribe } = usePushNotifications();
  const [, setLocation] = useLocation();
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
      default: return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  return (
    <div className="container max-w-screen-md mx-auto py-8 px-4 flex-1 page-enter">
      <Show when="signed-out">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 px-6 text-center"
        >
          <div className="relative mb-6">
            <div className="h-20 w-20 rounded-full bg-card border border-white/10 flex items-center justify-center mx-auto shadow-xl">
              <Bell className="h-9 w-9 text-primary" />
            </div>
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl mx-auto" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">Sign in to view notifications</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-8 leading-relaxed">
            Create a free account or sign in to receive map approvals, creator updates, and community alerts.
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
        </motion.div>
      </Show>

      <Show when="signed-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-5 border-b border-white/8">
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
            <Bell className="h-7 w-7 text-primary" />
            Notifications
          </h1>
          <div className="flex items-center gap-2">
            {permission !== "granted" && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-white/10 bg-white/4 hover:bg-white/8 text-xs rounded-xl transition-all"
                onClick={handleEnablePush}
                disabled={subscribing || permission === "denied"}
                title={permission === "denied" ? "Push notifications blocked in browser settings" : "Enable push notifications"}
              >
                <BellRing className="mr-1.5 h-3.5 w-3.5" />
                {permission === "denied" ? "Push blocked" : "Enable Push"}
              </Button>
            )}
            {notifications && notifications.some(n => !n.isRead) && (
              <motion.div whileTap={{ scale: 0.94 }}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-white/10 bg-white/4 hover:bg-white/8 text-xs rounded-xl transition-all"
                  onClick={handleMarkAllRead}
                  disabled={markAllReadMutation.isPending}
                >
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Mark all read
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Notification list */}
        <div className="space-y-3">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 border border-white/6 rounded-xl bg-card/60">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/5 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-3/4 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
            ))
          ) : notifications && notifications.length > 0 ? (
            <AnimatePresence initial={false}>
              {notifications.map((notif, i) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  transition={{ duration: 0.28, delay: i * 0.03, ease: "easeOut" }}
                  className={`flex gap-4 p-4 border rounded-xl transition-all duration-250 ${
                    notif.isRead
                      ? 'bg-card/50 border-white/6 opacity-65'
                      : 'bg-card border-primary/25 shadow-sm shadow-primary/10'
                  }`}
                >
                  {/* Icon */}
                  <div className={`mt-0.5 p-2 rounded-full border h-min shrink-0 transition-colors ${
                    notif.isRead ? 'bg-background/60 border-white/8' : 'bg-background border-white/10'
                  }`}>
                    {getIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-sm leading-snug ${!notif.isRead ? 'text-foreground' : 'text-foreground/75'}`}>
                      {notif.title}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{notif.message}</p>
                    <p className="text-xs text-muted-foreground/50 mt-1.5 font-medium">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </p>

                    {notif.link && (
                      <Button
                        variant="link"
                        className="px-0 h-auto mt-1.5 text-primary text-xs font-semibold hover:text-primary/80"
                        asChild
                      >
                        <Link href={notif.link}>View Details →</Link>
                      </Button>
                    )}
                  </div>

                  {/* Mark read button */}
                  {!notif.isRead && (
                    <motion.div whileTap={{ scale: 0.85 }} className="shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        onClick={() => handleMarkRead(notif.id)}
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-24 text-center border border-dashed border-white/8 rounded-2xl bg-card/20"
            >
              <div className="relative mb-4 inline-block">
                <Bell className="h-12 w-12 text-muted-foreground/25" />
                <div className="absolute inset-0 bg-primary/8 rounded-full blur-xl" />
              </div>
              <h3 className="text-xl font-bold mb-2">All caught up</h3>
              <p className="text-muted-foreground text-sm">You don't have any notifications right now.</p>
            </motion.div>
          )}
        </div>
      </Show>
    </div>
  );
}
