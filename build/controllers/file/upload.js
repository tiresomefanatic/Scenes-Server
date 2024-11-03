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
exports.uploadMedia = void 0;
const cloudinary_1 = __importDefault(require("../../config/cloudinary"));
const http_status_codes_1 = require("http-status-codes");
const errors_1 = require("../../errors");
const streamifier_1 = __importDefault(require("streamifier"));
const stream_1 = require("stream");
const uploadMedia = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.file || !req.body.mediaType) {
        throw new errors_1.BadRequestError("No file or media type provided");
    }
    try {
        const mediaType = req.body.mediaType;
        let folder;
        if (mediaType === "user_image") {
            folder = "user_images";
        }
        else if (mediaType === "reel_thumbnail") {
            folder = "reel_thumbnails";
        }
        else if (mediaType === "reel_video") {
            folder = "reel_videos";
        }
        else {
            throw new errors_1.BadRequestError("Invalid media type");
        }
        const streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                let uploadedBytes = 0;
                const totalBytes = req.file.size;
                const uploadStream = cloudinary_1.default.uploader.upload_stream({
                    folder,
                    use_filename: false,
                    unique_filename: false,
                    overwrite: false,
                    resource_type: mediaType === "reel_video" ? "video" : "image",
                }, (error, result) => {
                    if (result) {
                        console.log(result);
                        resolve(result);
                    }
                    else {
                        console.log(error);
                        reject(error);
                    }
                });
                const progressStream = new stream_1.Transform({
                    transform(chunk, encoding, callback) {
                        uploadedBytes += chunk.length;
                        const progress = (uploadedBytes / totalBytes) * 100;
                        console.log(`Upload progress: ${progress.toFixed(2)}%`);
                        callback(null, chunk);
                    },
                });
                streamifier_1.default
                    .createReadStream(req.file.buffer)
                    .pipe(progressStream)
                    .pipe(uploadStream);
            });
        };
        const result = yield streamUpload(req);
        res.status(http_status_codes_1.StatusCodes.OK).json({ mediaUrl: result.secure_url });
    }
    catch (error) {
        console.error(error);
        throw new errors_1.BadRequestError("Media upload failed");
    }
});
exports.uploadMedia = uploadMedia;
