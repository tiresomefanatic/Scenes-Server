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
exports.getPaginatedReplies = exports.deleteReply = exports.createReply = void 0;
const http_status_codes_1 = require("http-status-codes");
const errors_1 = require("../../errors");
const Like_1 = __importDefault(require("../../models/Like"));
const Comment_1 = __importDefault(require("../../models/Comment"));
const Reply_1 = __importDefault(require("../../models/Reply"));
const createReply = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { reply, mentionedUsers, gifUrl, commentId } = req.body;
    if ((!commentId || !gifUrl) && !reply) {
        throw new errors_1.BadRequestError("Either reply or gifUrl is required");
    }
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        throw new errors_1.BadRequestError("User not authenticated");
    }
    try {
        const comment = yield Comment_1.default.findById(commentId).populate('reel');
        if (!comment) {
            throw new errors_1.NotFoundError("comment not found");
        }
        const newReply = new Reply_1.default({
            user: userId,
            reply: reply || null,
            mentionedUsers: mentionedUsers || null,
            hasGif: !!gifUrl,
            gifUrl: gifUrl || null,
            comment: commentId,
            reel: comment.reel._id,
        });
        yield newReply.save();
        res
            .status(http_status_codes_1.StatusCodes.CREATED)
            .json(Object.assign({ id: newReply.id }, newReply.toJSON()));
    }
    catch (error) {
        console.error(error);
        throw new errors_1.BadRequestError(error);
    }
});
exports.createReply = createReply;
const deleteReply = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { replyId } = req.params;
    try {
        const reply = yield Reply_1.default.findByIdAndDelete(replyId);
        res
            .status(http_status_codes_1.StatusCodes.OK)
            .json({ msg: "Reply deleted successfully", reply });
    }
    catch (error) {
        console.error(error);
        throw new errors_1.BadRequestError(error instanceof Error ? error.message : String(error));
    }
});
exports.deleteReply = deleteReply;
const getPaginatedReplies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const { commentId, limit = 10, offset = 0 } = req.query;
    const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.userId;
    if (!userId) {
        throw new errors_1.BadRequestError("User not authenticated");
    }
    try {
        // Fetch comments and sort them based on the defined criteria
        const replies = yield Reply_1.default.find({ comment: commentId })
            .limit(Number(limit))
            .skip(Number(offset))
            .select("-likes")
            .populate("user", "username userImage")
            .exec();
        const finalReplies = yield Promise.all(replies.map((reply) => __awaiter(void 0, void 0, void 0, function* () {
            const likesCount = yield Like_1.default.countDocuments({ reply: reply._id });
            const isLiked = yield Like_1.default.countDocuments({
                reply: reply.id,
                user: userId,
                reel: reply.reel,
            });
            return Object.assign(Object.assign({}, reply.toJSON()), { likesCount, isLiked: isLiked == 0 ? false : true });
        })));
        res.status(http_status_codes_1.StatusCodes.OK).json(finalReplies);
    }
    catch (error) {
        console.error(error);
        res
            .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ error: "Internal Server Error" });
    }
});
exports.getPaginatedReplies = getPaginatedReplies;
