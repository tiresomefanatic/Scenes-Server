import express from "express";
import { uploadMedia } from "../controllers/file/upload";
import upload from "../config/multer";

const router = express.Router();

router.post("/upload", upload.single("image"), uploadMedia);

export default router;
