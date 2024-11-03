import express from "express";
import * as commentController from "../controllers/feed/comment";

const router = express.Router();

router.post("/", commentController.createComment);
router.delete("/:commentId", commentController.deleteComment);
router.post("/pin", commentController.markPin);
router.get("/", commentController.getPaginatedComments);

export default router;
