"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const CommentSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    reel: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Reel', required: true },
    comment: { type: String, maxlength: 500 },
    likes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Like' }],
    isPinned: { type: Boolean, default: false },
    isLikedByAuthor: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
    hasGif: { type: Boolean, default: false },
    gifUrl: { type: String },
    mentionedUsers: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    replies: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Reply' }],
});
CommentSchema.index({ user: 1 });
CommentSchema.index({ reel: 1 });
CommentSchema.index({ likes: 1 });
CommentSchema.index({ mentionedUsers: 1 });
CommentSchema.index({ replies: 1 });
const Comment = mongoose_1.default.model('Comment', CommentSchema);
exports.default = Comment;
