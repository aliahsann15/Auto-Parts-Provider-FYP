import { Request, Response } from "express";
import path from "path";
import fs from "fs";

export async function uploadImageHandler(req: Request, res: Response) {
  try {
    const file = (req as any).file;
    if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });

    // absolute path where file was written
    const savedPath = path.resolve(file.path || file.filename);
    const exists = fs.existsSync(savedPath);

    // Return a frontend-accessible URL. Use absolute origin if provided to help Next/Image.
    const FRONTEND_ORIGIN = process.env.NEXT_PUBLIC_FRONTEND_URL ?? ""; // e.g. "http://localhost:3000"
    const publicPath = `/images/uploads/${file.filename}`;
    const absoluteUrl = FRONTEND_ORIGIN ? `${FRONTEND_ORIGIN.replace(/\/$/, "")}${publicPath}` : '';

    return res.json({
      success: true,
      filename: file.filename,
      url: publicPath,
      absoluteUrl: absoluteUrl || publicPath,
      savedPath,
      exists,
    });
  } catch (err) {
    console.error("uploadImageHandler error:", err);
    return res.status(500).json({ success: false, message: "Upload failed" });
  }
}
