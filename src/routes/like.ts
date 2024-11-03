import express from "express";
import * as likeController from "../controllers/feed/like";

const router = express.Router();

router.post("/comment/:commentId", likeController.likeComment);
router.post("/reply/:replyId", likeController.likeReply);
router.post("/reel/:reelId", likeController.likeReel);
router.get("/", likeController.listLikes);

export default router;
