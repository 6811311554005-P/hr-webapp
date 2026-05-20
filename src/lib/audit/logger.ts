import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { Prisma, type AuditAction } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";

const MAX_METADATA_SIZE = 10 * 1024;
const MAX_METADATA_DEPTH = 4;
const MAX_ARRAY_ITEMS = 50;
const IGNORED_DIFF_FIELDS = new Set(["createdAt", "updatedAt"]);
const SENSITIVE_DIFF_FIELDS = new Set([
  "birthDate",
  "notes",
  "password",
  "passwordHash",
]);

type AuditLogInput = {
  action: AuditAction;
  entity: string;
  entityId?: string | number | null;
  statusCode: number;
  request?: NextRequest;
  session?: Session | null;
  metadata?: unknown;
};

type JsonRecord = Record<string, Prisma.InputJsonValue>;
type DiffInput = Record<string, unknown>;

const getClientIp = (request?: NextRequest): string | undefined => {
  if (!request) return undefined;

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || undefined;
  }

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    undefined
  );
};

const getPath = (request?: NextRequest): string => {
  if (!request) return "unknown";

  try {
    const url = new URL(request.url);
    return `${url.pathname}${url.search}`;
  } catch {
    return request.url || "unknown";
  }
};

const getUserId = (session?: Session | null): number | undefined => {
  const rawId = session?.user?.id;
  if (!rawId) return undefined;

  const parsed = Number(rawId);
  return Number.isInteger(parsed) ? parsed : undefined;
};

const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const getExistingRequestId = (
  metadata: unknown,
  request?: NextRequest
): string | undefined => {
  if (
    metadata &&
    !Array.isArray(metadata) &&
    typeof metadata === "object" &&
    "requestId" in metadata
  ) {
    const requestId = (metadata as { requestId?: unknown }).requestId;
    if (typeof requestId === "string" && requestId.trim()) {
      return requestId;
    }
  }

  return request?.headers.get("x-request-id") ?? undefined;
};

const byteSize = (value: string): number => {
  return Buffer.byteLength(value, "utf8");
};

const toJsonValue = (
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0
): Prisma.InputJsonValue | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Prisma.Decimal) return value.toString();
  if (["string", "number", "boolean"].includes(typeof value)) {
    return value as Prisma.InputJsonValue;
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return undefined;
  if (depth >= MAX_METADATA_DEPTH) return "[Max depth reached]";
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => toJsonValue(item, seen, depth + 1))
      .filter((item): item is Prisma.InputJsonValue => item !== undefined);
  }
  if (typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);

    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, toJsonValue(item, seen, depth + 1)] as const)
        .filter(
          (entry): entry is readonly [string, Prisma.InputJsonValue] =>
            entry[1] !== undefined
        )
    );
  }

  return String(value);
};

const metadataWithRequestId = (
  metadata: unknown,
  request?: NextRequest
): JsonRecord => {
  const requestId = getExistingRequestId(metadata, request) ?? generateRequestId();
  const sanitized = toJsonValue(metadata);

  if (
    sanitized &&
    !Array.isArray(sanitized) &&
    typeof sanitized === "object"
  ) {
    return { requestId, ...(sanitized as JsonRecord) };
  }

  if (sanitized === undefined) {
    return { requestId };
  }

  return { requestId, value: sanitized };
};

const createSafeMetadata = (
  metadata: unknown,
  request?: NextRequest
): Prisma.InputJsonValue => {
  try {
    const prepared = metadataWithRequestId(metadata, request);
    const serialized = JSON.stringify(prepared);
    const size = byteSize(serialized);

    if (size <= MAX_METADATA_SIZE) {
      return prepared;
    }

    return {
      requestId: prepared.requestId,
      truncated: true,
      originalSize: `${size} bytes`,
      message: "Metadata exceeded size limit",
    };
  } catch {
    return {
      requestId: generateRequestId(),
      truncated: true,
      message: "Metadata serialization failed",
    };
  }
};

export function createChangedFields(
  before: DiffInput,
  after: DiffInput
): JsonRecord {
  const changedFields: JsonRecord = {};

  for (const [field, nextValue] of Object.entries(after)) {
    if (IGNORED_DIFF_FIELDS.has(field) || SENSITIVE_DIFF_FIELDS.has(field)) {
      continue;
    }

    if (
      nextValue &&
      typeof nextValue === "object" &&
      !(nextValue instanceof Date) &&
      !(nextValue instanceof Prisma.Decimal)
    ) {
      continue;
    }

    const previousValue = before[field];
    const safePrevious = toJsonValue(previousValue);
    const safeNext = toJsonValue(nextValue);

    if (safeNext === undefined || JSON.stringify(safePrevious) === JSON.stringify(safeNext)) {
      continue;
    }

    changedFields[field] = {
      from: safePrevious ?? null,
      to: safeNext,
    };
  }

  return changedFields;
}

// TODO:
// Add scheduled retention cleanup:
// - archive logs older than 90 days
// - optional cold storage export
// - optional analytics warehouse sync

export async function logAuditEvent({
  action,
  entity,
  entityId,
  statusCode,
  request,
  session,
  metadata,
}: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId:
          entityId === null || entityId === undefined ? undefined : String(entityId),
        method: request?.method ?? "SYSTEM",
        path: getPath(request),
        statusCode,
        userId: getUserId(session),
        userEmail: session?.user?.email ?? undefined,
        ipAddress: getClientIp(request),
        userAgent: request?.headers.get("user-agent") ?? undefined,
        metadata: createSafeMetadata(metadata, request),
      },
    });
  } catch (error) {
    console.warn("Audit log write failed:", error);
  }
}
