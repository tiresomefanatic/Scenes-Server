"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reply_1 = require("../controllers/feed/reply");
const router = express_1.default.Router();
router.post('/', reply_1.createReply);
router.delete('/:replyId', reply_1.deleteReply);
router.get('/', reply_1.getPaginatedReplies);
exports.default = router;
