import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());


const ALLOWED_ORIGINS: Set<string> = new Set(
  (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

const REPL_DEV_DOMAIN = process.env.REPLIT_DEV_DOMAIN;
const REPL_SLUG = process.env.REPL_SLUG;
const REPL_OWNER = process.env.REPL_OWNER;

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  if (REPL_DEV_DOMAIN && origin === `https://${REPL_DEV_DOMAIN}`) return true;
  if (REPL_SLUG && REPL_OWNER) {
    const replitAppOrigin = `https://${REPL_SLUG}.${REPL_OWNER}.repl.co`;
    if (origin === replitAppOrigin) return true;
    const replitDevOrigin = `https://${REPL_OWNER}-${REPL_SLUG}.replit.dev`;
    if (origin === replitDevOrigin) return true;
  }
  return false;
}

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, isAllowedOrigin(origin));
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());

app.use("/api", router);

export default app;
