import express, { Router } from "express";
import {
  getProfile,
  updateProfile,
  toggleFollowing,
  viewUserByHandle,
  getFollowers,
  getFollowing,
  getUsersBySearch,
} from "../controllers/auth/user";

const router: Router = express.Router();

router.route("/profile").get(getProfile).patch(updateProfile);
router.put("/follow/:userId", toggleFollowing);
router.get("/profile/:username", viewUserByHandle);
router.get("/followers/:userId", getFollowers);
router.get("/following/:userId", getFollowing);
router.get("/search", getUsersBySearch);

export default router;
