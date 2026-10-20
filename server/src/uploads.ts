import { randomUUID } from 'node:crypto';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import { uploadDir } from './config.js';
import { HttpError } from './errors.js';
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, fieldSize: 10000 },
});
export async function saveImage(file?: Express.Multer.File): Promise<string | undefined> {
  if (!file) return undefined;
  try {
    const image = sharp(file.buffer, { limitInputPixels: 25000000, animated: false });
    const meta = await image.metadata();
    if (!meta.format || !['jpeg', 'png', 'webp'].includes(meta.format))
      throw new Error('Invalid format');
    await mkdir(uploadDir, { recursive: true });
    const filename = `${randomUUID()}.webp`;
    await image
      .rotate()
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 84 })
      .toFile(path.join(uploadDir, filename));
    return `/uploads/${filename}`;
  } catch {
    throw new HttpError(
      400,
      'Please upload a valid JPEG, PNG, or WebP image (at most 25 megapixels).',
    );
  }
}
export async function removeImage(imagePath?: string | null) {
  if (!imagePath || !/^\/uploads\/[a-f0-9-]+\.webp$/.test(imagePath)) return;
  await unlink(path.join(uploadDir, path.basename(imagePath))).catch(() => undefined);
}
