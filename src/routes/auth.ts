import express from 'express';
import {
  signInWithOauth,
  refreshToken,
  checkUsernameAvailability,
  signUpWithOauth,
} from '../controllers/auth/auth';

const router = express.Router();

router.post("/check-username", checkUsernameAvailability);
router.post("/login", signInWithOauth);
router.post("/register", signUpWithOauth);
router.post("/refresh-token", refreshToken);

export default router;
