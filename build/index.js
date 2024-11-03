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
exports.redisClient = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
require("express-async-errors");
const ioredis_1 = __importDefault(require("ioredis"));
const connect_1 = __importDefault(require("./config/connect"));
const not_found_1 = __importDefault(require("./middleware/not-found"));
const error_handler_1 = __importDefault(require("./middleware/error-handler"));
const authentication_1 = __importDefault(require("./middleware/authentication"));
// Routers
const auth_1 = __importDefault(require("./routes/auth"));
const file_1 = __importDefault(require("./routes/file"));
const comment_1 = __importDefault(require("./routes/comment"));
const like_1 = __importDefault(require("./routes/like"));
const reel_1 = __importDefault(require("./routes/reel"));
const feed_1 = __importDefault(require("./routes/feed"));
const user_1 = __importDefault(require("./routes/user"));
const reply_1 = __importDefault(require("./routes/reply"));
//import shareRouter from "./routes/share";
const categories_1 = __importDefault(require("./routes/categories"));
const locations_1 = __importDefault(require("./routes/locations"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Redis client setup
exports.redisClient = new ioredis_1.default("redis://localhost:6379");
exports.redisClient.on('error', (err) => console.log('Redis Client Error', err));
exports.redisClient.on('connect', () => console.log('Connected to Redis'));
// Routers
app.use("/oauth", auth_1.default);
app.use("/file", file_1.default);
//app.use("/share", shareRouter);
app.use("/user", authentication_1.default, user_1.default);
app.use("/comment", authentication_1.default, comment_1.default);
app.use("/reply", authentication_1.default, reply_1.default);
app.use("/like", authentication_1.default, like_1.default);
app.use("/reel", reel_1.default);
app.use("/feed", feed_1.default);
app.use('/categories', categories_1.default);
app.use('/locations', locations_1.default);
// Middleware
app.use(not_found_1.default);
app.use(error_handler_1.default);
// Start the server
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, connect_1.default)(process.env.MONGO_URI);
        console.log("Connected to MongoDB");
        yield exports.redisClient.ping();
        console.log("Connected to Redis");
        app.listen(process.env.PORT || 3000, () => console.log(`HTTP server is running on port ${process.env.PORT || 3000}`));
    }
    catch (error) {
        console.log(error);
        yield exports.redisClient.quit();
    }
});
// Graceful shutdown
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    yield exports.redisClient.quit();
    console.log("Disconnected from Redis");
    // Add MongoDB disconnection if needed
    process.exit(0);
}));
start();
