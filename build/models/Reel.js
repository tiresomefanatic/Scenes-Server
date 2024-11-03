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
const ReelSchema = new mongoose_1.Schema({
    location: { type: mongoose_1.Schema.Types.ObjectId, ref: "Location", required: true },
    category: { type: mongoose_1.Schema.Types.ObjectId, ref: "Category", required: true },
    videoUri: { type: String, required: true },
    thumbUri: { type: String, required: true },
    caption: { type: String, maxlength: 500 },
    likes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    comments: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Comment" }],
    viewCount: { type: Number, default: 0 },
}, { timestamps: true });
ReelSchema.index({ location: 1 });
ReelSchema.index({ category: 1 });
ReelSchema.index({ likes: 1 });
ReelSchema.index({ comments: 1 });
const Reel = mongoose_1.default.model("Reel", ReelSchema);
exports.default = Reel;
