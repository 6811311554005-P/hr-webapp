import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { Prisma } from "@prisma/client";
import { auth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma/client";
import { logAuditEvent } from "@/src/lib/audit/logger";
import {
  ImportFileValidationError,
  removePhysicalImportFile,
  validateAndStoreImportFile,
} from "@/src/lib/import-storage";

export const runtime = "nodejs";

const getUserId = (session: Session | null): number | undefined => {
  const parsed = Number(session?.user?.id);
  return Number.isInteger(parsed) ? parsed : undefined;
};

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let storedPathToCleanup: string | null = null;

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    if ((session.user as { role?: string } | undefined)?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden. Only administrators can upload import files." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Expected multipart field 'file'." }, { status: 400 });
    }

    const stored = await validateAndStoreImportFile({
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer: Buffer.from(await file.arrayBuffer()),
    });
    storedPathToCleanup = stored.storagePath;

    const existing = await prisma.importFile.findUnique({
      where: { sha256: stored.sha256 },
      select: {
        id: true,
        originalName: true,
        sha256: true,
        sizeBytes: true,
        status: true,
        refCount: true,
        metadata: true,
      },
    });

    if (existing) {
      await removePhysicalImportFile(stored.storagePath);
      storedPathToCleanup = null;

      const updated = await prisma.importFile.update({
        where: { id: existing.id },
        data: {
          refCount: { increment: 1 },
          lastUsedAt: new Date(),
          uploadedById: getUserId(session),
        },
        select: {
          id: true,
          originalName: true,
          sha256: true,
          sizeBytes: true,
          status: true,
          refCount: true,
          expiresAt: true,
          metadata: true,
        },
      });

      await logAuditEvent({
        action: "IMPORT",
        entity: "ImportFile",
        entityId: updated.id,
        statusCode: 200,
        request: req,
        session,
        metadata: {
          duplicateUpload: true,
          sha256: updated.sha256,
          sizeBytes: updated.sizeBytes.toString(),
          durationMs: Date.now() - startedAt,
        },
      });

      return NextResponse.json({
        success: true,
        duplicate: true,
        file: {
          ...updated,
          sizeBytes: updated.sizeBytes.toString(),
        },
      });
    }

    const created = await prisma.importFile.create({
      data: {
        sha256: stored.sha256,
        originalName: stored.originalName,
        storedName: stored.storedName,
        storagePath: stored.storagePath,
        mimeType: stored.mimeType,
        extension: stored.extension,
        sizeBytes: BigInt(stored.sizeBytes),
        status: "QUARANTINED",
        uploadedById: getUserId(session),
        expiresAt: stored.expiresAt,
        metadata: stored.metadata,
      },
      select: {
        id: true,
        originalName: true,
        sha256: true,
        sizeBytes: true,
        status: true,
        refCount: true,
        expiresAt: true,
        metadata: true,
      },
    });
    storedPathToCleanup = null;

    await logAuditEvent({
      action: "IMPORT",
      entity: "ImportFile",
      entityId: created.id,
      statusCode: 201,
      request: req,
      session,
      metadata: {
        duplicateUpload: false,
        sha256: created.sha256,
        originalName: created.originalName,
        sizeBytes: created.sizeBytes.toString(),
        status: created.status,
        durationMs: Date.now() - startedAt,
      },
    });

    return NextResponse.json(
      {
        success: true,
        duplicate: false,
        file: {
          ...created,
          sizeBytes: created.sizeBytes.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (storedPathToCleanup) {
      await removePhysicalImportFile(storedPathToCleanup).catch(() => undefined);
    }

    const status =
      error instanceof ImportFileValidationError
        ? error.status
        : error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
          ? 409
          : 500;
    const message = error instanceof Error ? error.message : "Import file upload failed.";

    await logAuditEvent({
      action: "ERROR",
      entity: "ImportFile",
      statusCode: status,
      request: req,
      metadata: {
        route: "POST /api/import-files",
        durationMs: Date.now() - startedAt,
        message,
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: status === 500 ? "Import file upload failed." : message,
      },
      { status }
    );
  }
}
