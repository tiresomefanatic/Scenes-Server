"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../controllers/auth/auth");
const router = express_1.default.Router();
router.post("/check-username", auth_1.checkUsernameAvailability);
router.post("/login", auth_1.signInWithOauth);
router.post("/register", auth_1.signUpWithOauth);
router.post("/refresh-token", auth_1.refreshToken);
exports.default = router;
