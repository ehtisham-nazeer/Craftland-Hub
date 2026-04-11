import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { getListNotificationsQueryKey } from "@workspace/api-client-react";
import { toast as sonnerToast } from "sonner";

const BASE_URL = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

interface NotificationPayload {
  title?: string;
  message?: string;
  type?: string;
}

function getNotificationIcon(type?: string): string {
  switch (type) {
    case "submission_approved": return "✅";
    case "submission_rejected": return "❌";
    case "creator_application_approved": return "🎉";
    case "creator_application_rejected": return "📋";
    case "new_comment": return "💬";
    default: return "🔔";
  }
}

export function useNotificationSSE() {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSignedIn) return;

    let abortController: AbortController | null = null;
    let closed = false;

    const connect = async () => {
      const token = await getToken();
      if (!token || closed) return;

      abortController = new AbortController();

      try {
        const response = await fetch(`${BASE_URL}/api/notifications/stream`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
          },
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          if (!closed) setTimeout(connect, 5000);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done || closed) break;

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data:")) {
                queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });

                // Parse and show an in-app toast
                try {
                  const raw = line.slice(5).trim();
                  const data = JSON.parse(raw) as NotificationPayload;
                  if (data.title && data.type !== "ping") {
                    const icon = getNotificationIcon(data.type);
                    sonnerToast(`${icon} ${data.title}`, {
                      description: data.message ?? undefined,
                      duration: 6000,
                    });
                  }
                } catch {
                  // Not JSON or no title — skip toast
                }
                break;
              }
            }
          }
        }
      } catch {
        if (!closed) setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      closed = true;
      abortController?.abort();
    };
  }, [isSignedIn, getToken, queryClient]);
}
