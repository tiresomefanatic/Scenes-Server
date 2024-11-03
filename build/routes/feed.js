"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const feed_1 = require("../controllers/feed/feed");
const router = express_1.default.Router();
router.get("/watchedreel/:userId", feed_1.getAllHistoryReels);
router.get("/likedreel/:userId", feed_1.getLikedVideos);
router.get("/reel/:userId", feed_1.getReelPosts);
router.post("/markwatched", feed_1.markReelsWatched);
router.get("/home", feed_1.getHomeFeed);
router.post('/log-interaction', feed_1.logInteraction);
router.get('/personalized-reels/:userId', feed_1.getPersonalizedReels);
//router.get('/user-total-score/:userId', getUserTotalScoreController);
exports.default = router;
