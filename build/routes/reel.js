"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reel_1 = require("../controllers/feed/reel");
const router = express_1.default.Router();
router.post("/", reel_1.createReel);
router.delete("/:reelId", reel_1.deleteReel);
router.patch("/:reelId/caption", reel_1.updateReelCaption);
router.get("/:reelId", reel_1.getReelById);
router.post("/bulk-insert", reel_1.bulkInsertReels);
exports.default = router;
