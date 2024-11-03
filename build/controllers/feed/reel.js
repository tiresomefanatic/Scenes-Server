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
exports.bulkInsertReels = exports.updateReelLocation = exports.updateReelCategory = exports.updateReelCaption = exports.deleteReel = exports.getReelById = exports.createReel = void 0;
const http_status_codes_1 = require("http-status-codes");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Reel_1 = __importDefault(require("../../models/Reel"));
const User_1 = __importDefault(require("../../models/User"));
const Like_1 = __importDefault(require("../../models/Like"));
const Comment_1 = __importDefault(require("../../models/Comment"));
const Location_1 = __importDefault(require("../../models/Location"));
const Category_1 = __importDefault(require("../../models/Category"));
const errors_1 = require("../../errors");
const mongoose_1 = __importDefault(require("mongoose"));
const createReel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { videoUri, thumbUri, caption, locationId, categoryId } = req.body;
    if (!videoUri || !thumbUri || !caption || !locationId || !categoryId) {
        throw new errors_1.BadRequestError("Invalid Body");
    }
    const accessToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    if (!accessToken) {
        throw new errors_1.UnauthenticatedError("No access token provided");
    }
    try {
        const decodedToken = jsonwebtoken_1.default.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        const userId = decodedToken.userId;
        const user = yield User_1.default.findById(userId);
        if (!user) {
            throw new errors_1.NotFoundError("User not found");
        }
        const location = yield Location_1.default.findById(locationId);
        if (!location) {
            throw new errors_1.NotFoundError("Location not found");
        }
        const category = yield Category_1.default.findById(categoryId);
        if (!category) {
            throw new errors_1.NotFoundError("Category not found");
        }
        const newReel = new Reel_1.default({ location: locationId, category: categoryId, videoUri, caption, thumbUri });
        yield newReel.save();
        res.status(http_status_codes_1.StatusCodes.CREATED).json(newReel);
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new errors_1.UnauthenticatedError("Invalid token");
        }
        throw new errors_1.BadRequestError(error instanceof Error ? error.message : String(error));
    }
});
exports.createReel = createReel;
const getReelById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const { reelId } = req.params;
    const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.userId;
    if (!userId) {
        throw new errors_1.UnauthenticatedError("User not authenticated");
    }
    try {
        const reel = yield Reel_1.default.findById(reelId)
            .populate("location", "name")
            .populate("category", "name popularityPercentage")
            .select("-likes -comments");
        if (!reel) {
            throw new errors_1.NotFoundError("Reel not found");
        }
        const likesCount = yield Like_1.default.countDocuments({ reel: reelId });
        const commentsCount = yield Comment_1.default.countDocuments({ reel: reelId });
        const isLiked = yield Like_1.default.exists({ reel: reelId, user: userId });
        const reelData = {
            _id: reel._id,
            videoUri: reel.videoUri,
            thumbUri: reel.thumbUri,
            caption: reel.caption,
            likesCount,
            commentsCount,
            location: {
                _id: reel.location._id,
                name: reel.location.name
            },
            category: {
                _id: reel.category._id,
                name: reel.category.name,
                popularityPercentage: reel.category.popularityPercentage
            },
            createdAt: reel.createdAt,
            updatedAt: reel.updatedAt,
            viewCount: reel.viewCount,
            isLiked: !!isLiked,
        };
        res.status(http_status_codes_1.StatusCodes.OK).json(reelData);
    }
    catch (error) {
        console.error(error);
        throw new errors_1.BadRequestError(error instanceof Error ? error.message : String(error));
    }
});
exports.getReelById = getReelById;
const deleteReel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    const { reelId } = req.params;
    const userId = (_c = req.user) === null || _c === void 0 ? void 0 : _c.userId;
    if (!userId) {
        throw new errors_1.UnauthenticatedError("User not authenticated");
    }
    try {
        const reel = yield Reel_1.default.findById(reelId);
        if (!reel) {
            throw new errors_1.NotFoundError("Reel not found");
        }
        // TODO: Implement authorization logic
        // For example, check if the user is an admin or has special permissions to delete reels
        // You might want to add a field to the User model to store user roles or permissions
        yield Reel_1.default.deleteOne({ _id: reelId });
        res.status(http_status_codes_1.StatusCodes.OK).json({ msg: "Reel deleted successfully" });
    }
    catch (error) {
        console.error(error);
        throw new errors_1.BadRequestError(error instanceof Error ? error.message : String(error));
    }
});
exports.deleteReel = deleteReel;
const updateReelCaption = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    const { reelId } = req.params;
    const { caption } = req.body;
    const userId = (_d = req.user) === null || _d === void 0 ? void 0 : _d.userId;
    if (!userId) {
        throw new errors_1.UnauthenticatedError("User not authenticated");
    }
    try {
        const reel = yield Reel_1.default.findById(reelId);
        if (!reel) {
            throw new errors_1.NotFoundError("Reel not found");
        }
        // TODO: Implement authorization logic
        // For example, check if the user is an admin or has special permissions to update reels
        // You might want to add a field to the User model to store user roles or permissions
        reel.caption = caption;
        yield reel.save();
        res.status(http_status_codes_1.StatusCodes.OK).json(reel);
    }
    catch (error) {
        throw new errors_1.BadRequestError(error instanceof Error ? error.message : String(error));
    }
});
exports.updateReelCaption = updateReelCaption;
const updateReelCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _e;
    const { reelId } = req.params;
    const { categoryId } = req.body;
    const userId = (_e = req.user) === null || _e === void 0 ? void 0 : _e.userId;
    if (!userId) {
        throw new errors_1.UnauthenticatedError("User not authenticated");
    }
    try {
        const reel = yield Reel_1.default.findById(reelId);
        if (!reel) {
            throw new errors_1.NotFoundError("Reel not found");
        }
        const category = yield Category_1.default.findById(categoryId);
        if (!category) {
            throw new errors_1.NotFoundError("Category not found");
        }
        // TODO: Implement authorization logic
        // For example, check if the user is an admin or has special permissions to update reels
        // You might want to add a field to the User model to store user roles or permissions
        reel.category = categoryId;
        yield reel.save();
        res.status(http_status_codes_1.StatusCodes.OK).json(reel);
    }
    catch (error) {
        throw new errors_1.BadRequestError(error instanceof Error ? error.message : String(error));
    }
});
exports.updateReelCategory = updateReelCategory;
const updateReelLocation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _f;
    const { reelId } = req.params;
    const { locationId } = req.body;
    const userId = (_f = req.user) === null || _f === void 0 ? void 0 : _f.userId;
    if (!userId) {
        throw new errors_1.UnauthenticatedError("User not authenticated");
    }
    try {
        const reel = yield Reel_1.default.findById(reelId);
        if (!reel) {
            throw new errors_1.NotFoundError("Reel not found");
        }
        const location = yield Location_1.default.findById(locationId);
        if (!location) {
            throw new errors_1.NotFoundError("Location not found");
        }
        // TODO: Implement authorization logic
        // For example, check if the user is an admin or has special permissions to update reels
        // You might want to add a field to the User model to store user roles or permissions
        reel.location = locationId;
        yield reel.save();
        res.status(http_status_codes_1.StatusCodes.OK).json(reel);
    }
    catch (error) {
        throw new errors_1.BadRequestError(error instanceof Error ? error.message : String(error));
    }
});
exports.updateReelLocation = updateReelLocation;
const locationIds = [
    "66d48f9e1a4e65ea9feaf762", "66d48f9e1a4e65ea9feaf763", "66d48f9e1a4e65ea9feaf764",
    "66d48f9e1a4e65ea9feaf765", "66d48f9e1a4e65ea9feaf766", "66d48f9e1a4e65ea9feaf767",
    "66d48f9e1a4e65ea9feaf768", "66d48f9e1a4e65ea9feaf769", "66d48f9e1a4e65ea9feaf76a",
    "66d48f9e1a4e65ea9feaf76b", "66d48f9e1a4e65ea9feaf76c", "66d48f9e1a4e65ea9feaf76d",
    "66d48f9e1a4e65ea9feaf76e", "66d48f9e1a4e65ea9feaf76f", "66d48f9e1a4e65ea9feaf770",
    "66d48f9e1a4e65ea9feaf771", "66d48f9e1a4e65ea9feaf772", "66d48f9e1a4e65ea9feaf773",
    "66d48f9e1a4e65ea9feaf774", "66d48f9e1a4e65ea9feaf775"
];
// Category IDs from the previous bulk insert (unchanged)
const categoryIds = [
    "66d4883f2434806067cef59a",
    "66d4883f2434806067cef599",
    "66d4883f2434806067cef5ba",
    "66d4883f2434806067cef5b4",
    "66d4883f2434806067cef5a0"
];
const videoUrls = [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
];
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];
const createSampleReel = () => ({
    location: new mongoose_1.default.Types.ObjectId(getRandomElement(locationIds)),
    category: new mongoose_1.default.Types.ObjectId(getRandomElement(categoryIds)),
    videoUri: getRandomElement(videoUrls),
    thumbUri: "https://picsum.photos/seed/user1beach/300/300",
    caption: `Sample reel caption ${Math.floor(Math.random() * 1000)}`,
    viewCount: Math.floor(Math.random() * 10000),
});
const bulkInsertReels = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const numberOfReels = 100; // Fixed number of reels
        const sampleReels = Array.from({ length: numberOfReels }, createSampleReel);
        const result = yield Reel_1.default.insertMany(sampleReels);
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            message: 'Reels bulk inserted successfully',
            count: result.length
        });
    }
    catch (error) {
        console.error('Error bulk inserting reels:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Error bulk inserting reels',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.bulkInsertReels = bulkInsertReels;
