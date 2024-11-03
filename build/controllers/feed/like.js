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
exports.likeReel = exports.listLikes = exports.likeReply = exports.likeComment = void 0;
const http_status_codes_1 = require("http-status-codes");
const errors_1 = require("../../errors");
const Like_1 = __importDefault(require("../../models/Like"));
const User_1 = __importDefault(require("../../models/User"));
const Reel_1 = __importDefault(require("../../models/Reel"));
const Comment_1 = __importDefault(require("../../models/Comment"));
const Reply_1 = __importDefault(require("../../models/Reply"));
const likeComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const commentId = req.params.commentId;
    if (!commentId) {
        throw new errors_1.BadRequestError("Comment Id not available");
    }
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    try {
        const comment = yield Comment_1.default.findById(commentId).populate("reel");
        if (!comment) {
            throw new errors_1.NotFoundError("Comment not found");
        }
        const existingLike = yield Like_1.default.findOne({
            user: userId,
            comment: commentId,
        });
        if (existingLike) {
            yield Like_1.default.findByIdAndDelete(existingLike.id);
            if (((_c = (_b = comment.reel) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.toString()) === userId) {
                comment.isLikedByAuthor = false;
                yield comment.save();
            }
            res.status(http_status_codes_1.StatusCodes.OK).json({ msg: "Unliked", data: existingLike });
        }
        else {
            const newLike = new Like_1.default({ user: userId, comment: commentId });
            yield newLike.save();
            if (((_e = (_d = comment.reel) === null || _d === void 0 ? void 0 : _d.user) === null || _e === void 0 ? void 0 : _e.toString()) === userId) {
                comment.isLikedByAuthor = true;
                yield comment.save();
            }
            res.status(http_status_codes_1.StatusCodes.OK).json({ msg: "Liked", data: newLike });
        }
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
exports.likeComment = likeComment;
const likeReply = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _f;
    const replyId = req.params.replyId;
    if (!replyId) {
        throw new errors_1.BadRequestError("Reply Id not available");
    }
    const userId = (_f = req.user) === null || _f === void 0 ? void 0 : _f.userId;
    try {
        const reply = yield Reply_1.default.findById(replyId).populate("comment");
        if (!reply) {
            throw new errors_1.NotFoundError("reply not found");
        }
        const comment = yield Comment_1.default.findById(reply.comment._id).populate("reel");
        if (!comment) {
            throw new errors_1.NotFoundError("Comment not found");
        }
        const existingLike = yield Like_1.default.findOne({
            user: userId,
            reply: replyId,
        });
        if (existingLike) {
            yield Like_1.default.findByIdAndDelete(existingLike.id);
            if (comment.reel.user.toString() === userId) {
                reply.isLikedByAuthor = false;
                yield reply.save();
            }
            res.status(http_status_codes_1.StatusCodes.OK).json({ msg: "Unliked", data: existingLike });
        }
        else {
            const newLike = new Like_1.default({ user: userId, reply: replyId });
            yield newLike.save();
            if (comment.reel.user.toString() === userId) {
                reply.isLikedByAuthor = true;
                yield reply.save();
            }
            res.status(http_status_codes_1.StatusCodes.OK).json({ msg: "Liked", data: newLike });
        }
    }
    catch (error) {
        console.error(error);
        if (error instanceof Error) {
            throw new errors_1.BadRequestError(error.message);
        }
        else {
            throw new errors_1.BadRequestError('An unknown error occurred');
        }
    }
});
exports.likeReply = likeReply;
const likeReel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _g;
    const reelId = req.params.reelId;
    if (!reelId) {
        throw new errors_1.BadRequestError("Reel Id not available");
    }
    const userId = (_g = req.user) === null || _g === void 0 ? void 0 : _g.userId;
    const reel = yield Reel_1.default.findById(reelId);
    if (!reel) {
        throw new errors_1.NotFoundError("reel not found");
    }
    try {
        const existingLike = yield Like_1.default.findOne({ user: userId, reel: reel.id });
        if (existingLike) {
            yield Like_1.default.findByIdAndDelete(existingLike.id);
            res.status(http_status_codes_1.StatusCodes.OK).json({ msg: "Unliked", data: existingLike });
        }
        else {
            const newLike = new Like_1.default({ user: userId, reel: reel.id });
            yield newLike.save();
            res.status(http_status_codes_1.StatusCodes.OK).json({ msg: "Liked", data: newLike });
        }
    }
    catch (error) {
        console.error(error);
        res
            .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ error: "Internal Server Error" });
    }
});
exports.likeReel = likeReel;
const listLikes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _h, _j;
    const { type, entityId, searchQuery, page = 1, limit = 15 } = req.query;
    const userId = (_h = req.user) === null || _h === void 0 ? void 0 : _h.userId;
    try {
        let likes;
        let query = {};
        let populateQuery = {
            path: "user",
            select: "username userImage name id",
        };
        if (type === "reel") {
            query = { reel: entityId };
        }
        else if (type === "comment") {
            query = { comment: entityId };
        }
        else if (type === "reply") {
            query = { reply: entityId };
        }
        else {
            throw new errors_1.BadRequestError("Invalid type");
        }
        if (typeof searchQuery === 'string') {
            populateQuery.match = {
                $or: [
                    { username: { $regex: searchQuery, $options: "i" } },
                    { name: { $regex: searchQuery, $options: "i" } },
                ],
            };
        }
        likes = yield Like_1.default.find(query).populate(populateQuery).lean();
        likes = likes.filter((like) => like.user);
        const userFollowing = yield User_1.default.findById(userId)
            .select("following")
            .lean();
        const followingIds = new Set(((_j = userFollowing === null || userFollowing === void 0 ? void 0 : userFollowing.following) === null || _j === void 0 ? void 0 : _j.map((id) => id.toString())) || []);
        likes = likes.map((like) => {
            return Object.assign(Object.assign({}, like.user), { isFollowing: followingIds.has(like.user._id.toString()) });
        });
        likes.sort((a, b) => {
            const aFollow = a.isFollowing;
            const bFollow = b.isFollowing;
            return aFollow === bFollow ? 0 : aFollow ? -1 : 1;
        });
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = Number(page) * Number(limit);
        const paginatedLikes = likes.slice(startIndex, endIndex);
        res.status(http_status_codes_1.StatusCodes.OK).json(paginatedLikes);
    }
    catch (error) {
        console.error(error);
        res
            .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ error: "Internal Server Error" });
    }
});
exports.listLikes = listLikes;
