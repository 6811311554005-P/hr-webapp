import { prisma } from "@/src/lib/prisma";
import { removePhysicalImportFile } from "@/src/lib/import-storage";

async function cleanupImportFiles() {
  const now = new Date();
  const expiredFiles = await prisma.importFile.findMany({
    where: {
      expiresAt: {
        lte: now,
      },
      status: {
        in: ["QUARANTINED", "IMPORTED"],
      },
    },
    select: {
      id: true,
      storagePath: true,
      originalName: true,
      sha256: true,
    },
    take: 500,
  });

  let deleted = 0;
  let failed = 0;

  for (const file of expiredFiles) {
    try {
      await removePhysicalImportFile(file.storagePath);
      await prisma.importFile.update({
        where: { id: file.id },
        data: {
          status: "EXPIRED",
          storagePath: "",
          metadata: {
            cleanupAt: new Date().toISOString(),
            originalName: file.originalName,
            sha256: file.sha256,
          },
        },
      });
      deleted += 1;
    } catch (error) {
      failed += 1;
      console.warn(
        `Failed to cleanup import file ${file.id}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.log(`Import file cleanup complete. Deleted=${deleted} Failed=${failed}`);
}

cleanupImportFiles()
  .catch((error) => {
    console.error("Import file cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
