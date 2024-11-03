import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import "express-async-errors";
import Redis from "ioredis";
import connectDB from "./config/connect";
import notFoundMiddleware from "./middleware/not-found";
import errorHandlerMiddleware from "./middleware/error-handler";
import authMiddleware from "./middleware/authentication";

// Routers
import authRouter from "./routes/auth";
import fileRouter from "./routes/file";
import commentRouter from "./routes/comment";
import likeRouter from "./routes/like";
import reelRouter from "./routes/reel";
import feedRouter from "./routes/feed";
import user from "./routes/user";
import replyRouter from "./routes/reply";
//import shareRouter from "./routes/share";
import categoryRoutes from "./routes/categories";
import locationRoutes from "./routes/locations";
dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true, // Enable credentials (cookies, authorization headers, etc)
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Redis client setup
export const redisClient = new Redis("redis://localhost:6379");

redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.on("connect", () => console.log("Connected to Redis"));

// Routers
app.use("/oauth", authRouter);
app.use("/file", fileRouter);
//app.use("/share", shareRouter);
app.use("/user", authMiddleware, user);
app.use("/comment", authMiddleware, commentRouter);
app.use("/reply", authMiddleware, replyRouter);
app.use("/like", authMiddleware, likeRouter);
app.use("/reel", reelRouter);
app.use("/feed", feedRouter);
app.use("/categories", categoryRoutes);
app.use("/locations", locationRoutes);

// Middleware
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

// Start the server
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI!);
    console.log("Connected to MongoDB");

    await redisClient.ping();
    console.log("Connected to Redis");

    app.listen(process.env.PORT || 8080, () =>
      console.log(`HTTP server is running on port ${process.env.PORT || 8080}`)
    );
  } catch (error) {
    console.log(error);
    await redisClient.quit();
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  await redisClient.quit();
  console.log("Disconnected from Redis");
  // Add MongoDB disconnection if needed
  process.exit(0);
});

start();
