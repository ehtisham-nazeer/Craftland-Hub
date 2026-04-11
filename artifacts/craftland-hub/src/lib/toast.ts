import { toast as sonner } from "sonner";

const BRAND = "CraftLand Hub";

function buildDescription(message: string, extra?: string): string {
  return extra ? `${message} — ${extra}` : message;
}

export const toast = {
  success(message: string, opts?: { description?: string; duration?: number }) {
    return sonner.success(BRAND, {
      description: buildDescription(message, opts?.description),
      duration: opts?.duration ?? 3000,
    });
  },
  error(message: string, opts?: { description?: string; duration?: number }) {
    return sonner.error(BRAND, {
      description: buildDescription(message, opts?.description),
      duration: opts?.duration ?? 4000,
    });
  },
  info(message: string, opts?: { description?: string; duration?: number }) {
    return sonner.info(BRAND, {
      description: buildDescription(message, opts?.description),
      duration: opts?.duration ?? 3000,
    });
  },
  warning(message: string, opts?: { description?: string; duration?: number }) {
    return sonner.warning(BRAND, {
      description: buildDescription(message, opts?.description),
      duration: opts?.duration ?? 3500,
    });
  },
  loading(message: string) {
    return sonner.loading(BRAND, { description: message });
  },
  dismiss(id?: string | number) {
    return sonner.dismiss(id);
  },
};
