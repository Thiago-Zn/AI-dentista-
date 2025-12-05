/**
 * Multipart audio upload handler
 * Bypasses express.json() to avoid 50MB base64 payloads
 * Uploads directly to storage using streaming
 */

import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { AUDIO_CONSTRAINTS } from "../../shared/schemas/consultation";

// Store files in memory (we'll immediately upload to Manus storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: AUDIO_CONSTRAINTS.MAX_SIZE_BYTES, // 25MB
    files: 1, // Only one file per upload
  },
  fileFilter: (req, file, cb) => {
    // Validate mime type
    if (!AUDIO_CONSTRAINTS.ALLOWED_TYPES.includes(file.mimetype as any)) {
      cb(
        new Error(
          `Tipo de áudio não suportado: ${file.mimetype}. Use: ${AUDIO_CONSTRAINTS.ALLOWED_TYPES.join(", ")}`
        )
      );
      return;
    }
    cb(null, true);
  },
});

/**
 * Multer middleware for single audio file upload
 */
export const uploadAudioMulter = upload.single("audio");

/**
 * Upload handler for audio files
 * Expects: authenticated user, consultationId in body, audio file
 * Returns: { fileKey, audioUrl, mimeType, sizeBytes }
 */
export async function handleAudioUpload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Check authentication (user should be set by createContext middleware)
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Autenticação necessária" });
    }

    // Validate consultationId
    const consultationId = parseInt(req.body.consultationId);
    if (!consultationId || isNaN(consultationId)) {
      return res.status(400).json({ error: "consultationId inválido" });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo de áudio enviado" });
    }

    const file = req.file;
    const mimeType = file.mimetype;
    const sizeBytes = file.size;

    // Generate unique file key
    const extension = mimeType.split("/")[1] || "webm";
    const fileKey = `consultations/${user.id}/${consultationId}/audio-${nanoid()}.${extension}`;

    // Upload to storage (Manus proxy)
    const { url } = await storagePut(fileKey, file.buffer, mimeType);

    // Return metadata
    return res.status(200).json({
      success: true,
      fileKey,
      audioUrl: url,
      mimeType,
      sizeBytes,
    });
  } catch (error: any) {
    console.error("[Upload] Audio upload failed:", error);

    // Handle multer errors
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: `Arquivo muito grande (máx ${AUDIO_CONSTRAINTS.MAX_SIZE_MB}MB)`,
      });
    }

    return res.status(500).json({
      error: error.message || "Erro ao fazer upload do áudio",
    });
  }
}
