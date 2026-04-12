import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

function isReplitEnvironment(): boolean {
  return !!(process.env.REPLIT_DEPLOYMENT || process.env.REPL_ID || process.env.REPL_SLUG);
}

// Lazy-load @google-cloud/storage only when actually needed (on Replit).
// This prevents a module-not-found crash on Vercel where the package is
// marked external and may not be included in the serverless function bundle.
let _gcsModule: { Storage: new (...args: unknown[]) => unknown; File: new (...args: unknown[]) => unknown } | null = null;

function getGCSModule() {
  if (_gcsModule === null) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _gcsModule = require("@google-cloud/storage") as typeof _gcsModule;
  }
  return _gcsModule!;
}

let _objectStorageClient: unknown = null;

function getObjectStorageClient() {
  if (!_objectStorageClient) {
    const { Storage } = getGCSModule();
    _objectStorageClient = new Storage({
      credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
        type: "external_account",
        credential_source: {
          url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
          format: {
            type: "json",
            subject_token_field_name: "access_token",
          },
        },
        universe_domain: "googleapis.com",
      },
      projectId: "",
    });
  }
  return _objectStorageClient as {
    bucket: (name: string) => {
      file: (name: string) => unknown;
    };
  };
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageUnavailableError extends Error {
  constructor() {
    super("Object storage is only available on Replit. Image upload is not supported in this environment.");
    this.name = "ObjectStorageUnavailableError";
    Object.setPrototypeOf(this, ObjectStorageUnavailableError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<unknown | null> {
    if (!isReplitEnvironment()) {
      return null;
    }
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const client = getObjectStorageClient();
      const bucket = client.bucket(bucketName);
      const file = bucket.file(objectName) as { exists: () => Promise<[boolean]> };
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }
    return null;
  }

  async downloadObject(file: unknown, cacheTtlSec: number = 3600): Promise<Response> {
    const typedFile = file as {
      getMetadata: () => Promise<[{ contentType?: string; size?: number }]>;
      createReadStream: () => import("stream").Readable;
    };
    const [metadata] = await typedFile.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file as Parameters<typeof getObjectAclPolicy>[0]);
    const isPublic = aclPolicy?.visibility === "public";

    const { Readable } = await import("stream");
    const nodeStream = typedFile.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": (metadata.contentType as string) || "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) {
      headers["Content-Length"] = String(metadata.size);
    }

    return new Response(webStream, { headers });
  }

  async getObjectEntityUploadURL(): Promise<string> {
    if (!isReplitEnvironment()) {
      throw new ObjectStorageUnavailableError();
    }

    const privateObjectDir = this.getPrivateObjectDir();

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  async getObjectEntityFile(objectPath: string): Promise<unknown> {
    if (!isReplitEnvironment()) {
      throw new ObjectNotFoundError();
    }

    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const client = getObjectStorageClient();
    const bucket = client.bucket(bucketName);
    const objectFile = bucket.file(objectName) as {
      exists: () => Promise<[boolean]>;
    };
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile as Parameters<typeof setObjectAclPolicy>[0], aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: unknown;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile: objectFile as Parameters<typeof canAccessObject>[0]["objectFile"],
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1]!;
  const objectName = pathParts.slice(2).join("/");

  return { bucketName, objectName };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const body = await response.json() as { signed_url: string };
  return body.signed_url;
}
