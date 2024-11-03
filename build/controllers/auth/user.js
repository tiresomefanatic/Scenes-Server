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
exports.getUsersBySearch = exports.viewUserByHandle = exports.getFollowing = exports.getFollowers = exports.toggleFollowing = exports.updateProfile = exports.getProfile = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = __importDefault(require("mongoose"));
const errors_1 = require("../../errors");
const User_1 = __importDefault(require("../../models/User"));
const Reel_1 = __importDefault(require("../../models/Reel"));
// Get user profile
const getProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        throw new errors_1.BadRequestError("User ID is missing");
    }
    const user = yield User_1.default.findById(userId);
    if (!user) {
        throw new errors_1.NotFoundError("User not found");
    }
    try {
        const followersCount = yield User_1.default.countDocuments({ following: user._id });
        const followingCount = yield User_1.default.countDocuments({ followers: user._id });
        const reelsCount = yield Reel_1.default.countDocuments({ user: user._id });
        res.status(http_status_codes_1.StatusCodes.OK).json({
            user: {
                name: user.name,
                id: user.id,
                username: user.username,
                userImage: user.userImage,
                email: user.email,
                bio: user.bio,
                followersCount,
                followingCount,
                reelsCount,
            },
        });
    }
    catch (error) {
        throw new errors_1.BadRequestError(error instanceof Error ? error.message : String(error));
    }
});
exports.getProfile = getProfile;
const viewUserByHandle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const username = req.params.username;
    if (!username) {
        throw new errors_1.BadRequestError("Missing username in path parameter");
    }
    const user = yield User_1.default.findOne({ username: username }).select("-followers -following");
    if (!user) {
        throw new errors_1.NotFoundError("User not found");
    }
    const followersCount = yield User_1.default.countDocuments({ following: user._id });
    const isFollowing = yield User_1.default.countDocuments({
        following: user._id,
        _id: (_b = req.user) === null || _b === void 0 ? void 0 : _b.userId,
    });
    const followingCount = yield User_1.default.countDocuments({ followers: user._id });
    const reelsCount = yield Reel_1.default.countDocuments({ user: user._id });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        user: {
            id: user.id,
            userImage: user.userImage,
            username: user.username,
            bio: user.bio,
            followersCount,
            followingCount,
            reelsCount,
            isFollowing: isFollowing > 0,
        },
    });
});
exports.viewUserByHandle = viewUserByHandle;
// Update user profile
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    const userId = (_c = req.user) === null || _c === void 0 ? void 0 : _c.userId;
    if (!userId) {
        throw new errors_1.BadRequestError("User ID is missing");
    }
    const user = yield User_1.default.findById(userId);
    if (!user) {
        throw new errors_1.NotFoundError("User not found");
    }
    const { name, bio, userImage } = req.body;
    if (!name && !bio && !userImage) {
        throw new errors_1.BadRequestError("No Update Fields provided");
    }
    try {
        if (name)
            user.name = name;
        if (bio)
            user.bio = bio;
        if (userImage)
            user.userImage = userImage;
        yield user.save();
        res.status(http_status_codes_1.StatusCodes.OK).json({ msg: "Profile updated successfully" });
    }
    catch (error) {
        throw new errors_1.BadRequestError(error instanceof Error ? error.message : String(error));
    }
});
exports.updateProfile = updateProfile;
const toggleFollowing = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    const userId = (_d = req.user) === null || _d === void 0 ? void 0 : _d.userId;
    if (!userId) {
        throw new errors_1.BadRequestError("User ID is missing");
    }
    const targetUserId = new mongoose_1.default.Types.ObjectId(req.params.userId);
    if (!targetUserId) {
        throw new errors_1.BadRequestError("Missing target user ID");
    }
    // Check if the target user exists
    const targetUser = yield User_1.default.findById(targetUserId);
    if (!targetUser) {
        throw new errors_1.NotFoundError("User not found");
    }
    const currentUser = yield User_1.default.findById(userId);
    if (!currentUser) {
        throw new errors_1.NotFoundError("User not found");
    }
    try {
        const isFollowing = currentUser.following.includes(targetUserId); // Check if already following
        if (isFollowing) {
            // Unfollow
            yield User_1.default.updateOne({ _id: userId }, { $pull: { following: targetUserId } });
            yield User_1.default.updateOne({ _id: targetUserId }, { $pull: { followers: userId } });
        }
        else {
            // Follow (update this part similarly)
            yield User_1.default.updateOne({ _id: userId }, { $push: { following: targetUserId } });
            yield User_1.default.updateOne({ _id: targetUserId }, { $push: { followers: userId } });
        }
        // Remove these lines
        // await currentUser.save();
        // await targetUser.save();
        res
            .status(http_status_codes_1.StatusCodes.OK)
            .json({ msg: isFollowing ? "Unfollowed" : "Followed" });
    }
    catch (error) {
        throw new errors_1.BadRequestError(error instanceof Error ? error.message : String(error));
    }
});
exports.toggleFollowing = toggleFollowing;
const getFollowers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.userId;
    const currentUserId = req.user.userId;
    const searchText = req.query.searchText;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    if (!userId) {
        throw new errors_1.BadRequestError("Missing user ID in query parameter");
    }
    const user = yield User_1.default.findById(userId);
    if (!user) {
        throw new errors_1.NotFoundError("User not found");
    }
    const followers = yield User_1.default.aggregate([
        {
            $match: {
                _id: { $in: user.followers },
                $or: [
                    { name: { $regex: searchText, $options: "i" } },
                    { username: { $regex: searchText, $options: "i" } },
                ],
            },
        },
        {
            $addFields: {
                isFollowing: { $in: [currentUserId, "$following"] },
            },
        },
        {
            $project: {
                name: 1,
                username: 1,
                userImage: 1,
                id: 1,
                isFollowing: 1,
            },
        },
        {
            $sort: {
                isFollowing: -1,
            },
        },
        {
            $skip: offset,
        },
        {
            $limit: limit,
        },
    ]);
    res.status(http_status_codes_1.StatusCodes.OK).json(followers);
});
exports.getFollowers = getFollowers;
const getFollowing = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.userId;
    const currentUserId = new mongoose_1.default.Types.ObjectId(req.user.userId);
    const searchText = req.query.searchText;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    if (!userId) {
        throw new errors_1.BadRequestError("Missing user ID in query parameter");
    }
    const user = yield User_1.default.findById(userId);
    if (!user) {
        throw new errors_1.NotFoundError("User not found");
    }
    const following = yield User_1.default.aggregate([
        {
            $match: { _id: { $in: user.following } },
        },
        {
            $addFields: {
                isFollowing: { $in: [currentUserId, "$followers"] },
            },
        },
        {
            $match: {
                $or: [
                    { name: { $regex: searchText, $options: "i" } },
                    { username: { $regex: searchText, $options: "i" } },
                ],
            },
        },
        {
            $project: {
                name: 1,
                username: 1,
                userImage: 1,
                id: 1,
                isFollowing: 1,
            },
        },
        {
            $sort: {
                isFollowing: -1,
            },
        },
        {
            $skip: offset,
        },
        {
            $limit: limit,
        },
    ]);
    res.status(http_status_codes_1.StatusCodes.OK).json(following);
});
exports.getFollowing = getFollowing;
const getUsersBySearch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const searchText = req.query.text;
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.user.userId;
    let searchQuery = {};
    if (searchText) {
        searchQuery = {
            $or: [
                { name: { $regex: searchText, $options: "i" } },
                { username: { $regex: searchText, $options: "i" } },
            ],
        };
    }
    let users = yield User_1.default.aggregate([
        {
            $match: searchQuery,
        },
        {
            $addFields: {
                isFollowing: { $in: [userId, "$followers"] },
            },
        },
        {
            $match: {
                _id: { $ne: userId },
            },
        },
        {
            $project: {
                _id: 1,
                username: 1,
                userImage: 1,
                name: 1,
            },
        },
        {
            $sort: {
                isFollowing: -1,
                createdAt: -1,
            },
        },
        {
            $limit: limit,
        },
    ]);
    res.status(http_status_codes_1.StatusCodes.OK).json({ users });
});
exports.getUsersBySearch = getUsersBySearch;
