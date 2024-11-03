import express, { Router } from "express";
import {
  createReel,
  deleteReel,
  updateReelCaption,
  getReelById,
  bulkInsertReels,
} from "../controllers/feed/reel";

const router: Router = express.Router();

router.post("/", createReel);
router.delete("/:reelId", deleteReel);
router.patch("/:reelId/caption", updateReelCaption);
router.get("/:reelId", getReelById);
router.post("/bulk-insert", bulkInsertReels);




export default router;
