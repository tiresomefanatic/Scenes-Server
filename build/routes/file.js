"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const upload_1 = require("../controllers/file/upload");
const multer_1 = __importDefault(require("../config/multer"));
const router = express_1.default.Router();
router.post("/upload", multer_1.default.single("image"), upload_1.uploadMedia);
exports.default = router;
