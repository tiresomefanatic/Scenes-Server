"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markPin = exports.deleteComment = exports.createComment = exports.getPaginatedComments = void 0;
const http_status_codes_1 = require("http-status-codes");
const errors_1 = require("../../errors");
const User_1 = __importDefault(require("../../models/User"));
const Reel_1 = __importDefault(require("../../models/Reel"));
const Like_1 = __importDefault(require("../../models/Like"));
const Comment_1 = __importDefault(require("../../models/Comment"));
const Reply_1 = __importDefault(require("../../models/Reply"));
const getPaginatedComments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { reelId, limit = '10', offset = '0' } = req.query;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const user = yield User_1.default.findById(userId);
    if (!user) {
        throw new errors_1.NotFoundError("User not found");
    }
    try {
        // Fetch comments with the required fields and sort them by createdAt initially
        const comments = yield Comment_1.default.find({ reel: reelId })
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(offset))
            .select("-likes")
            .populate("user", "username userImage id name")
            .populate("replies.user", "username userImage id name")
            .exec();
        // Get all comment IDs for batch operations
        const commentIds = comments.map((comment) => comment._id);
        // Fetch likes and replies counts in a single batch query using aggregation
        const [likesCounts, repliesCounts, userLikes] = yield Promise.all([
            Like_1.default.aggregate([
                { $match: { comment: { $in: commentIds } } },
                { $group: { _id: "$comment", count: { $sum: 1 } } },
            ]),
            Reply_1.default.aggregate([
                { $match: { comment: { $in: commentIds } } },
                { $group: { _id: "$comment", count: { $sum: 1 } } },
            ]),
            Like_1.default.find({ user: userId, comment: { $in: commentIds } }).distinct("comment"),
        ]);
        // Convert arrays to maps for quick lookup
        const likesCountMap = new Map(likesCounts.map((item) => [item._id.toString(), item.count]));
        const repliesCountMap = new Map(repliesCounts.map((item) => [item._id.toString(), item.count]));
        const userLikesSet = new Set(userLikes.map((id) => id.toString()));
        // Enrich comments with counts and liked status
        const enrichedComments = comments.map((comment) => {
            var _a, _b, _c;
            const commentJSON = comment.toJSON();
            commentJSON.likesCount = likesCountMap.get((_a = comment._id) === null || _a === void 0 ? void 0 : _a.toString()) || 0;
            commentJSON.repliesCount = repliesCountMap.get((_b = comment._id) === null || _b === void 0 ? void 0 : _b.toString()) || 0;
            commentJSON.isLiked = userLikesSet.has((_c = comment._id) === null || _c === void 0 ? void 0 : _c.toString());
            return commentJSON;
        });
        // Sort comments based on custom criteria
        const sortedComments = enrichedComments.sort((a, b) => {
            var _a, _b, _c, _d;
            if (a.isPinned && !b.isPinned)
                return -1;
            if (!a.isPinned && b.isPinned)
                return 1;
            if (a.isLikedByAuthor && !b.isLikedByAuthor)
                return -1;
            if (!a.isLikedByAuthor && b.isLikedByAuthor)
                return 1;
            const aHasUserReply = a.replies.some((reply) => reply.user._id.toString() === userId);
            const bHasUserReply = b.replies.some((reply) => reply.user._id.toString() === userId);
            if (aHasUserReply && !bHasUserReply)
                return -1;
            if (!aHasUserReply && bHasUserReply)
                return 1;
            if (a.likesCount > b.likesCount)
                return -1;
            if (a.likesCount < b.likesCount)
                return 1;
            const aUserFollowing = (_b = (_a = a.user.followers) === null || _a === void 0 ? void 0 : _a.includes(userId)) !== null && _b !== void 0 ? _b : false;
            const bUserFollowing = (_d = (_c = b.user.followers) === null || _c === void 0 ? void 0 : _c.includes(userId)) !== null && _d !== void 0 ? _d : false;
            if (aUserFollowing && !bUserFollowing)
                return -1;
            if (!aUserFollowing && bUserFollowing)
                return 1;
            return b.createdAt.getTime() - a.createdAt.getTime();
        });
        res.status(http_status_codes_1.StatusCodes.OK).json(sortedComments);
    }
    catch (error) {
        console.error(error);
        res
            .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ error: "Internal Server Error" });
    }
});
exports.getPaginatedComments = getPaginatedComments;
const createComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { comment, mentionedUsers, gifUrl, reelId } = req.body;
    if ((!comment || !gifUrl) && !reelId) {
        // Handle this case (e.g., throw an error or return)
    }
    const { userId } = req.user;
    try {
        const reel = yield Reel_1.default.findById(reelId);
        if (!reel) {
            throw new errors_1.NotFoundError("Reel not found");
        }
        const newComment = new Comment_1.default({
            user: userId,
            comment: comment ? comment : null,
            mentionedUsers: mentionedUsers ? mentionedUsers : null,
            hasGif: gifUrl ? true : false,
            gifUrl: gifUrl ? gifUrl : null,
            reel: reelId,
        });
        yield newComment.save();
        res
            .status(http_status_codes_1.StatusCodes.CREATED)
            .json(Object.assign(Object.assign({}, newComment.toJSON()), { repliesCount: 0 }));
    }
    catch (error) {
        console.error(error);
        if (error instanceof errors_1.NotFoundError) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({ error: error.message });
        }
        else {
            res
                .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
                .json({ error: "Internal Server Error" });
        }
    }
});
exports.createComment = createComment;
const deleteComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { commentId } = req.params;
    try {
        const comment = yield Comment_1.default.findByIdAndDelete(commentId);
        res
            .status(http_status_codes_1.StatusCodes.OK)
            .json({ msg: "Comment deleted successfully", comment });
    }
    catch (error) {
        console.error(error);
        if (error instanceof errors_1.NotFoundError) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({ error: error.message });
        }
        else {
            res
                .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
                .json({ error: "Internal Server Error" });
        }
    }
});
exports.deleteComment = deleteComment;
const markPin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { commentId } = req.body;
    try {
        const comment = yield Comment_1.default.findById(commentId);
        if (!comment) {
            throw new errors_1.NotFoundError("Comment not found");
        }
        comment.isPinned = !comment.isPinned;
        yield comment.save();
        res.status(http_status_codes_1.StatusCodes.OK).json(comment);
    }
    catch (error) {
        console.error(error);
        if (error instanceof errors_1.NotFoundError) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({ error: error.message });
        }
        else {
            res
                .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
                .json({ error: "Internal Server Error" });
        }
    }
});
exports.markPin = markPin;
