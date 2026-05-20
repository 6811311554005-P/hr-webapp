import { createHash, randomUUID } from "crypto";
import { mkdir, readdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";

const DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_STORAGE_BYTES = 1024 * 1024 * 1024;
const DEFAULT_RETENTION_DAYS = 30;

const ALLOWED_EXTENSIONS = new Set([".xlsx", ".xls", ".csv"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "text/plain",
  "application/octet-stream",
]);

export type StoredImportFileInput = {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
};

export type StoredImportFile = {
  originalName: string;
  storedName: string;
  storagePath: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  sha256: string;
  expiresAt: Date;
  metadata: {
    scanStatus: "quarantined";
    checks: string[];
    warnings: string[];
  };
};

export class ImportFileValidationError extends Error {
  status = 400;

  constructor(message: string) {
    super(message);
    this.name = "ImportFileValidationError";
  }
}

const getStorageRoot = (): string => {
  const configuredRoot = process.env.UPLOAD_STORAGE_DIR;

  if (configuredRoot) {
    return path.resolve(/*turbopackIgnore: true*/ configuredRoot);
  }

  return path.join(/*turbopackIgnore: true*/ process.cwd(), "storage", "uploads");
};

const getMaxFileBytes = (): number => {
  return Number(process.env.UPLOAD_MAX_FILE_BYTES ?? DEFAULT_MAX_FILE_BYTES);
};

const getMaxStorageBytes = (): number => {
  return Number(process.env.UPLOAD_STORAGE_MAX_BYTES ?? DEFAULT_MAX_STORAGE_BYTES);
};

const getRetentionDays = (): number => {
  return Number(process.env.UPLOAD_RETENTION_DAYS ?? DEFAULT_RETENTION_DAYS);
};

const sanitizeFileName = (fileName: string): string => {
  const base = path.basename(fileName).replace(/[^\w.\- ]+/g, "_").trim();
  return base || "import-file";
};

const sha256 = (buffer: Buffer): string => {
  return createHash("sha256").update(buffer).digest("hex");
};

const startsWith = (buffer: Buffer, bytes: number[]): boolean => {
  return bytes.every((byte, index) => buffer[index] === byte);
};

const looksLikeCsv = (buffer: Buffer): boolean => {
  if (buffer.includes(0)) return false;
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096)).toString("utf8");
  return /[\r\n,;]/.test(sample);
};

const detectSpreadsheetVectors = (
  buffer: Buffer,
  extension: string
): { checks: string[]; warnings: string[] } => {
  const checks: string[] = [];
  const warnings: string[] = [];
  const lowerBinaryText = buffer.subarray(0, Math.min(buffer.length, 2_000_000)).toString("latin1").toLowerCase();

  if (extension === ".xlsx") {
    checks.push("zip-signature");
    if (!startsWith(buffer, [0x50, 0x4b])) {
      throw new ImportFileValidationError("Invalid .xlsx file signature.");
    }
    if (lowerBinaryText.includes("vbaproject.bin")) {
      throw new ImportFileValidationError("Macro-enabled workbook content is not allowed.");
    }
    if (lowerBinaryText.includes("externalLink".toLowerCase())) {
      warnings.push("external-link-reference-detected");
    }
    if (lowerBinaryText.includes("oleobject")) {
      throw new ImportFileValidationError("Embedded OLE objects are not allowed.");
    }
  }

  if (extension === ".xls") {
    checks.push("ole-compound-signature");
    if (!startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
      throw new ImportFileValidationError("Invalid .xls file signature.");
    }
    warnings.push("legacy-xls-format-quarantined");
  }

  if (extension === ".csv") {
    checks.push("csv-text-check");
    if (!looksLikeCsv(buffer)) {
      throw new ImportFileValidationError("Invalid CSV content.");
    }
    if (/^[=+\-@]/m.test(buffer.toString("utf8", 0, Math.min(buffer.length, 256_000)))) {
      warnings.push("csv-formula-prefix-detected");
    }
  }

  return { checks, warnings };
};

const getDirectorySize = async (directory: string): Promise<number> => {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const sizes = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(/*turbopackIgnore: true*/ directory, entry.name);
        if (entry.isDirectory()) return getDirectorySize(fullPath);
        if (!entry.isFile()) return 0;
        return (await stat(fullPath)).size;
      })
    );
    return sizes.reduce((total, size) => total + size, 0);
  } catch {
    return 0;
  }
};

export const removePhysicalImportFile = async (storagePath: string): Promise<void> => {
  const root = getStorageRoot();
  const resolved = path.resolve(/*turbopackIgnore: true*/ storagePath);

  if (!resolved.startsWith(root + path.sep)) {
    throw new Error("Refusing to delete a file outside upload storage.");
  }

  await unlink(resolved).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
};

export const validateAndStoreImportFile = async ({
  originalName,
  mimeType,
  buffer,
}: StoredImportFileInput): Promise<StoredImportFile> => {
  const cleanName = sanitizeFileName(originalName);
  const extension = path.extname(cleanName).toLowerCase();
  const sizeBytes = buffer.byteLength;

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new ImportFileValidationError("Only .xlsx, .xls, and .csv files are allowed.");
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType || "application/octet-stream")) {
    throw new ImportFileValidationError("File MIME type is not allowed.");
  }

  if (sizeBytes === 0) {
    throw new ImportFileValidationError("Uploaded file is empty.");
  }

  const maxFileBytes = getMaxFileBytes();
  if (sizeBytes > maxFileBytes) {
    throw new ImportFileValidationError(`File exceeds ${(maxFileBytes / 1024 / 1024).toFixed(0)} MB limit.`);
  }

  const { checks, warnings } = detectSpreadsheetVectors(buffer, extension);
  const root = getStorageRoot();
  const quarantineDir = path.join(root, "quarantine");
  await mkdir(quarantineDir, { recursive: true });

  const currentStorageBytes = await getDirectorySize(root);
  const maxStorageBytes = getMaxStorageBytes();
  if (currentStorageBytes + sizeBytes > maxStorageBytes) {
    throw new ImportFileValidationError("Upload storage quota exceeded. Retention cleanup is required.");
  }

  const hash = sha256(buffer);
  const storedName = `${hash.slice(0, 16)}-${randomUUID()}${extension}`;
  const storagePath = path.join(quarantineDir, storedName);
  await writeFile(storagePath, buffer, { flag: "wx" });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + getRetentionDays());

  return {
    originalName: cleanName,
    storedName,
    storagePath,
    mimeType,
    extension,
    sizeBytes,
    sha256: hash,
    expiresAt,
    metadata: {
      scanStatus: "quarantined",
      checks,
      warnings,
    },
  };
};
