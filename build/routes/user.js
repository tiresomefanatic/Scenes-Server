"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_1 = require("../controllers/auth/user");
const router = express_1.default.Router();
router.route("/profile").get(user_1.getProfile).patch(user_1.updateProfile);
router.put("/follow/:userId", user_1.toggleFollowing);
router.get("/profile/:username", user_1.viewUserByHandle);
router.get("/followers/:userId", user_1.getFollowers);
router.get("/following/:userId", user_1.getFollowing);
router.get("/search", user_1.getUsersBySearch);
exports.default = router;
