import express, { Router } from "express";
import {
  getLikedVideos,
  getAllHistoryReels,
  markReelsWatched,
  getHomeFeed,
  getReelPosts,
  logInteraction,
  getPersonalizedReels,
} from "../controllers/feed/feed";

const router: Router = express.Router();

router.get("/watchedreel/:userId", getAllHistoryReels);
router.get("/likedreel/:userId", getLikedVideos);
router.get("/reel/:userId", getReelPosts);
router.post("/markwatched", markReelsWatched);
router.get("/home", getHomeFeed);

router.post('/log-interaction', logInteraction);
router.get('/personalized-reels/:userId', getPersonalizedReels);
//router.get('/user-total-score/:userId', getUserTotalScoreController);

export default router;
