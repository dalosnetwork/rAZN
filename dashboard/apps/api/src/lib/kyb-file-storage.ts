import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_KYB_UPLOAD_DIR = "/tmp/dashboard-kyb-uploads";
const DEFAULT_MAX_KYB_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const PDF_SIGNATURE = Buffer.from("%PDF-", "utf8");
const STORAGE_URI_PREFIX = "local://kyb/";

export const KYB_FILE_STORAGE_ERRORS = {
  emptyFile: "KYB_FILE_EMPTY",
  invalidMimeType: "KYB_FILE_INVALID_MIME_TYPE",
  invalidPdfSignature: "KYB_FILE_INVALID_PDF_SIGNATURE",
  fileTooLarge: "KYB_FILE_TOO_LARGE",
  fileWriteFailed: "KYB_FILE_WRITE_FAILED",
  invalidStorageUri: "KYB_FILE_INVALID_STORAGE_URI",
  fileNotFound: "KYB_FILE_NOT_FOUND",
} as const;

function sanitizeFileNameSegment(
  value: string,
  fallback: string,
  maxLength = 40,
) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLength);

  return normalized.length > 0 ? normalized : fallback;
}

function toFileTimestamp(value: Date) {
  const utcMonth = String(value.getUTCMonth() + 1).padStart(2, "0");
  const utcDay = String(value.getUTCDate()).padStart(2, "0");
  const utcYear = String(value.getUTCFullYear());
  return `${utcMonth}_${utcDay}_${utcYear}`;
}

function getKybUploadDir() {
  const configuredDir = process.env.KYB_UPLOAD_DIR?.trim();
  if (!configuredDir) {
    return DEFAULT_KYB_UPLOAD_DIR;
  }

  return path.resolve(configuredDir);
}

function getMaxKybFileSizeBytes() {
  const configured = Number(process.env.KYB_MAX_FILE_SIZE_BYTES);
  if (Number.isFinite(configured) && configured > 0) {
    return Math.floor(configured);
  }

  return DEFAULT_MAX_KYB_FILE_SIZE_BYTES;
}

function toStorageUri(fileName: string) {
  return `${STORAGE_URI_PREFIX}${fileName}`;
}

function parseStorageUri(storageUri: string) {
  if (!storageUri.startsWith(STORAGE_URI_PREFIX)) {
    throw new Error(KYB_FILE_STORAGE_ERRORS.invalidStorageUri);
  }

  const fileName = storageUri.slice(STORAGE_URI_PREFIX.length);
  if (!fileName || fileName !== path.basename(fileName)) {
    throw new Error(KYB_FILE_STORAGE_ERRORS.invalidStorageUri);
  }
  if (!/^[a-z0-9_]+\.pdf$/i.test(fileName)) {
    throw new Error(KYB_FILE_STORAGE_ERRORS.invalidStorageUri);
  }

  return fileName;
}

export function getKybUploadLimits() {
  return {
    maxBytes: getMaxKybFileSizeBytes(),
    allowedMimeTypes: ["application/pdf"] as const,
    requiredExtension: ".pdf" as const,
  };
}

export function buildKybStorageFileName(input: {
  documentType: string;
  userName: string;
  userId: string;
  now: Date;
}) {
  const documentSlug = sanitizeFileNameSegment(input.documentType, "document");
  const userNameSlug = sanitizeFileNameSegment(input.userName, "user");
  const userSlug = sanitizeFileNameSegment(input.userId, "user", 32);
  const timestamp = toFileTimestamp(input.now);
  return `${documentSlug}_${userNameSlug}_${userSlug}_${timestamp}.pdf`;
}

export async function saveKybPdfFile(input: {
  documentType: string;
  userName: string;
  userId: string;
  file: File;
  now: Date;
}) {
  const limits = getKybUploadLimits();
  const { file } = input;

  if (file.size < 1) {
    throw new Error(KYB_FILE_STORAGE_ERRORS.emptyFile);
  }
  if (file.size > limits.maxBytes) {
    throw new Error(KYB_FILE_STORAGE_ERRORS.fileTooLarge);
  }
  if (file.type && file.type !== "application/pdf") {
    throw new Error(KYB_FILE_STORAGE_ERRORS.invalidMimeType);
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  if (!fileBuffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
    throw new Error(KYB_FILE_STORAGE_ERRORS.invalidPdfSignature);
  }

  const uploadDir = getKybUploadDir();
  await mkdir(uploadDir, { recursive: true });

  const baseFileName = buildKybStorageFileName({
    documentType: input.documentType,
    userName: input.userName,
    userId: input.userId,
    now: input.now,
  });
  const extension = path.extname(baseFileName);
  const baseName = path.basename(baseFileName, extension);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const fileName =
      attempt === 0 ? baseFileName : `${baseName}_${attempt}${extension}`;
    const absolutePath = path.join(uploadDir, fileName);

    try {
      await writeFile(absolutePath, fileBuffer, { flag: "wx" });
      return {
        storageUri: toStorageUri(fileName),
        fileName,
        sizeBytes: fileBuffer.length,
      };
    } catch (error) {
      if (
        !(
          error &&
          typeof error === "object" &&
          "code" in error &&
          (error as { code?: unknown }).code === "EEXIST"
        )
      ) {
        throw error;
      }
    }
  }

  throw new Error(KYB_FILE_STORAGE_ERRORS.fileWriteFailed);
}

export async function readKybPdfFile(storageUri: string) {
  const fileName = parseStorageUri(storageUri);
  const absolutePath = path.join(getKybUploadDir(), fileName);

  try {
    const fileBuffer = await readFile(absolutePath);
    return {
      fileName,
      contentType: "application/pdf",
      fileBuffer,
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if ((error as { code?: unknown }).code === "ENOENT") {
        throw new Error(KYB_FILE_STORAGE_ERRORS.fileNotFound);
      }
    }
    throw error;
  }
}
