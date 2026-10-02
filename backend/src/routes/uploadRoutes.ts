import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import asyncHandler from "express-async-handler";
import { uploadImageHandler } from "../controllers/uploadController";
import authenticateToken from "../middleware/auth";

const router = express.Router();

// Resolve a stable images directory whether the server is started from repo root or /backend
// Resolve project root based on this file location (works in src/ and dist/)
const projectRoot = path.resolve(__dirname, '..', '..', '..');
const candidateBaseDirs = [
  path.join(projectRoot, 'web', 'public', 'images'),             // <repo>/web/public/images
  path.resolve(process.cwd(), "web", "public", "images"),        // when running from repo root
  path.resolve(process.cwd(), "..", "web", "public", "images"),  // when running from backend/
  path.resolve(process.cwd(), "..", "..", "web", "public", "images"), // deeper fallback
];
const BASE_IMAGES_DIR = (() => {
  for (const dir of candidateBaseDirs) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      return dir;
    } catch {
      // try next candidate
    }
  }
  // fallback to process.cwd if all else fails
  const fallback = path.resolve(process.cwd(), "public", "images");
  fs.mkdirSync(fallback, { recursive: true });
  return fallback;
})();


// keep original filename but sanitize and prepend timestamp to avoid collisions
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const folderName = (req.body?.folderName || '').trim() || 'uploads';
    const targetDir = path.join(BASE_IMAGES_DIR, folderName);
    fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: (_req, file, cb) => {
    const base = path.basename(file.originalname);
    const safe = base.replace(/[^\w.\-()]/g, "_");
    const filename = `${Date.now()}-${safe}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  // allow a bit more than 5MB to accommodate encoding overhead
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif|heic)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      // return an error so caller sees why upload failed
      cb(new Error("Only image files are allowed"));
    }
  },
});

// POST /api/upload/image
router.post(
  "/image",
  authenticateToken as express.RequestHandler,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    await uploadImageHandler(req, res);
  })
);

export default router;
