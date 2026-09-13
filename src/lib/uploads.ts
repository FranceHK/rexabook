const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Reads an uploaded image into a data-URI string for storage in PostgreSQL.
 * The legacy app stored receipt photos on the filesystem; RexaBook keeps them
 * inside the Neon database so the app stays serverless-friendly and secure.
 */
export async function imageToDataUri(file: File): Promise<string> {
  if (!file) {
    throw new Error("Picha haikupakiwa.");
  }

  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Aina ya faili si sahihi (JPEG, PNG, GIF, WEBP tu).");
  }

  if (file.size > MAX_BYTES) {
    throw new Error("Picha ni kubwa mno (max 5MB).");
  }

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${file.type};base64,${base64}`;
}

/** Detects the underlying image type from a data URI (used by report views). */
export function dataUriSuffix(uri: string | null | undefined): string {
  if (!uri) return "";
  const m = uri.match(/^data:image\/(webp|png|jpeg|gif);base64,/);
  return m ? m[1] : "";
}