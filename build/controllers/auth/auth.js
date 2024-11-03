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
exports.checkUsernameAvailability = exports.refreshToken = exports.signUpWithOauth = exports.signInWithOauth = void 0;
const User_1 = __importDefault(require("../../models/User"));
const http_status_codes_1 = require("http-status-codes");
const errors_1 = require("../../errors");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const google_auth_library_1 = require("google-auth-library");
const Reel_1 = __importDefault(require("../../models/Reel"));
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const checkUsernameAvailability = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username } = req.body;
    if (!username) {
        throw new errors_1.BadRequestError("Username is required");
    }
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
        throw new errors_1.BadRequestError("Invalid username. Username can only contain letters, numbers, and underscores, and must be between 3 and 30 characters long.");
    }
    const user = yield User_1.default.findOne({ username });
    if (user) {
        return res.status(http_status_codes_1.StatusCodes.OK).json({ available: false });
    }
    return res.status(http_status_codes_1.StatusCodes.OK).json({ available: true });
});
exports.checkUsernameAvailability = checkUsernameAvailability;
const signUpWithOauth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { provider, id_token, name, userImage, username, bio, email } = req.body;
    if (!provider ||
        !id_token ||
        !name ||
        !userImage ||
        !username ||
        !bio ||
        !email ||
        // !["google", "facebook"].includes(provider)
        provider !== "google") {
        throw new errors_1.BadRequestError("Invalid body request");
    }
    try {
        let verifiedEmail;
        // if (provider === "facebook") {
        //   const { data } = await axios.get(
        //     `https://graph.facebook.com/v20.0/me?access_token=${id_token}&fields=id,email`
        //   );
        //   verifiedEmail = data.email;
        // }
        if (provider === "google") {
            const ticket = yield googleClient.verifyIdToken({
                idToken: id_token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            if (!payload || !payload.email) {
                throw new errors_1.UnauthenticatedError("Invalid Token or missing email");
            }
            verifiedEmail = payload.email;
        }
        if (verifiedEmail !== email) {
            throw new errors_1.UnauthenticatedError("Invalid Token or expired");
        }
        let user = yield User_1.default.findOne({ email: verifiedEmail });
        if (!user) {
            user = new User_1.default({
                email: verifiedEmail,
                username,
                name,
                userImage,
                bio,
            });
            yield user.save();
        }
        const accessToken = user.createAccessToken();
        const refreshToken = user.createRefreshToken();
        res.status(http_status_codes_1.StatusCodes.OK).json({
            user: {
                name: user.name,
                id: user.id,
                username: user.username,
                userImage: user.userImage,
                email: user.email,
                bio: user.bio,
            },
            tokens: { access_token: accessToken, refresh_token: refreshToken },
        });
    }
    catch (error) {
        console.error(error);
        throw new errors_1.UnauthenticatedError("Invalid Token or expired");
    }
});
exports.signUpWithOauth = signUpWithOauth;
const signInWithOauth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { provider, id_token } = req.body;
    // if (!provider || !id_token || !["google", "facebook"].includes(provider)) {
    if (!provider || !id_token || provider !== "google") {
        throw new errors_1.BadRequestError("Invalid body request");
    }
    try {
        let verifiedEmail;
        // if (provider === "facebook") {
        //   const { data } = await axios.get(
        //     `https://graph.facebook.com/v20.0/me?access_token=${id_token}&fields=id,email`
        //   );
        //   verifiedEmail = data.email;
        // }
        if (provider === "google") {
            const ticket = yield googleClient.verifyIdToken({
                idToken: id_token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            if (!payload || !payload.email) {
                throw new errors_1.UnauthenticatedError("Invalid Token or missing email");
            }
            verifiedEmail = payload.email;
        }
        const user = yield User_1.default.findOne({ email: verifiedEmail }).select("-followers -following");
        if (!user) {
            throw new errors_1.NotFoundError("User does not exist");
        }
        const followersCount = yield User_1.default.countDocuments({ following: user._id });
        const followingCount = yield User_1.default.countDocuments({ followers: user._id });
        const reelsCount = yield Reel_1.default.countDocuments({ user: user._id });
        const accessToken = user.createAccessToken();
        const refreshToken = user.createRefreshToken();
        res.status(http_status_codes_1.StatusCodes.OK).json({
            user: {
                name: user.name,
                id: user.id,
                username: user.username,
                userImage: user.userImage,
                email: user.email,
                followersCount,
                followingCount,
                reelsCount,
                bio: user.bio,
            },
            tokens: { access_token: accessToken, refresh_token: refreshToken },
        });
    }
    catch (error) {
        console.error(error);
        throw new errors_1.UnauthenticatedError("Invalid Token or expired");
    }
});
exports.signInWithOauth = signInWithOauth;
const refreshToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { refresh_token } = req.body;
    if (!refresh_token) {
        throw new errors_1.BadRequestError("Refresh token is required");
    }
    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) {
        throw new Error("REFRESH_TOKEN_SECRET is not defined");
    }
    try {
        const payload = jsonwebtoken_1.default.verify(refresh_token, secret);
        const user = yield User_1.default.findById(payload.userId);
        if (!user) {
            throw new errors_1.UnauthenticatedError("Invalid refresh token");
        }
        const newAccessToken = user.createAccessToken();
        const newRefreshToken = user.createRefreshToken();
        res.status(http_status_codes_1.StatusCodes.OK).json({
            tokens: { access_token: newAccessToken, refresh_token: newRefreshToken },
        });
    }
    catch (error) {
        console.error(error);
        throw new errors_1.UnauthenticatedError("Invalid refresh token");
    }
});
exports.refreshToken = refreshToken;
