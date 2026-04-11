import { initWebPush } from "./lib/webPush";
import app from "./app";
import type { Request, Response, NextFunction } from "express";

initWebPush();

// Wrap with error boundary to surface crash details as JSON
function handler(req: Request, res: Response, next: NextFunction) {
  try {
    app(req, res, next);
  } catch (e) {
    const err = e as Error;
    console.error("[serverless] Unhandled error:", err.message, err.stack);
    if (!res.headersSent) {
      res.status(500).json({
        error: err.message,
        at: err.stack?.split("\n")[1]?.trim(),
      });
    }
  }
}

export default handler;
