import { useState, useCallback } from "react";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

/**
 * Uploads an image to Cloudinary (when env vars are configured) or falls back
 * to the Replit object storage API. Works on Vercel and Replit.
 *
 * Required env vars for Vercel/production:
 *   VITE_CLOUDINARY_CLOUD_NAME    — your Cloudinary cloud name
 *   VITE_CLOUDINARY_UPLOAD_PRESET — an unsigned upload preset name
 */
export function useImageUpload(options: {
  onSuccess?: (url: string) => void;
  onError?: (err: Error) => void;
} = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      if (!file.type.startsWith("image/")) {
        const err = new Error("Only image files are allowed.");
        options.onError?.(err);
        return null;
      }

      if (file.size > 10 * 1024 * 1024) {
        const err = new Error("File size exceeds 10MB limit.");
        options.onError?.(err);
        return null;
      }

      setIsUploading(true);
      setProgress(10);

      try {
        if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET) {
          // --- Cloudinary unsigned upload (works on Vercel) ---
          const formData = new FormData();
          formData.append("file", file);
          formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

          setProgress(30);

          const res = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            { method: "POST", body: formData }
          );

          if (!res.ok) {
            const errData = await res.json().catch(() => ({})) as { error?: { message?: string } };
            throw new Error(errData?.error?.message || "Cloudinary upload failed.");
          }

          const data = await res.json() as { secure_url: string };
          setProgress(100);
          options.onSuccess?.(data.secure_url);
          return data.secure_url;
        } else {
          // --- Replit object storage fallback ---
          const metaRes = await fetch("/api/storage/uploads/request-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: file.name,
              size: file.size,
              contentType: file.type || "application/octet-stream",
            }),
          });

          if (!metaRes.ok) {
            const errData = await metaRes.json().catch(() => ({})) as { error?: string };
            throw new Error(errData.error || "Failed to get upload URL.");
          }

          setProgress(30);

          const { uploadURL, objectPath } = await metaRes.json() as { uploadURL: string; objectPath: string };

          const putRes = await fetch(uploadURL, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type || "application/octet-stream" },
          });

          if (!putRes.ok) {
            throw new Error("Failed to upload file to storage.");
          }

          setProgress(100);
          const servingUrl = `/api/storage${objectPath}`;
          options.onSuccess?.(servingUrl);
          return servingUrl;
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed.");
        options.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [options]
  );

  return { uploadFile, isUploading, progress };
}
