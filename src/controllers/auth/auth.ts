import { Request, Response } from 'express';
import User from '../../models/User';
import { StatusCodes } from 'http-status-codes';
import {
  BadRequestError,
  UnauthenticatedError,
  NotFoundError,
} from '../../errors';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import Reel from '../../models/Reel';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const checkUsernameAvailability = async (req: Request, res: Response): Promise<Response> => {
  const { username } = req.body;

  if (!username) {
    throw new BadRequestError("Username is required");
  }

  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;

  if (!usernameRegex.test(username)) {
    throw new BadRequestError(
      "Invalid username. Username can only contain letters, numbers, and underscores, and must be between 3 and 30 characters long."
    );
  }

  const user = await User.findOne({ username });

  if (user) {
    return res.status(StatusCodes.OK).json({ available: false });
  }

  return res.status(StatusCodes.OK).json({ available: true });
};

const signUpWithOauth = async (req: Request, res: Response): Promise<void> => {
  const { provider, id_token, name, userImage, username, bio, email } =
    req.body;

  if (
    !provider ||
    !id_token ||
    !name ||
    !userImage ||
    !username ||
    !bio ||
    !email ||
    // !["google", "facebook"].includes(provider)
    provider !== "google"
  ) {
    throw new BadRequestError("Invalid body request");
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
      const ticket = await googleClient.verifyIdToken({
        idToken: id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthenticatedError("Invalid Token or missing email");
      }
      verifiedEmail = payload.email;
    }
    if (verifiedEmail !== email) {
      throw new UnauthenticatedError("Invalid Token or expired");
    }

    let user = await User.findOne({ email: verifiedEmail });

    if (!user) {
      user = new User({
        email: verifiedEmail,
        username,
        name,
        userImage,
        bio,
      });
      await user.save();
    }

    const accessToken = user.createAccessToken();
    const refreshToken = user.createRefreshToken();

    res.status(StatusCodes.OK).json({
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
  } catch (error) {
    console.error(error);
    throw new UnauthenticatedError("Invalid Token or expired");
  }
};

const signInWithOauth = async (req: Request, res: Response): Promise<void> => {
  const { provider, id_token } = req.body;

  // if (!provider || !id_token || !["google", "facebook"].includes(provider)) {
  if (!provider || !id_token || provider !== "google") {
    throw new BadRequestError("Invalid body request");
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
      const ticket = await googleClient.verifyIdToken({
        idToken: id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthenticatedError("Invalid Token or missing email");
      }
      verifiedEmail = payload.email;
    }

    const user = await User.findOne({ email: verifiedEmail }).select(
      "-followers -following"
    );

    if (!user) {
      throw new NotFoundError("User does not exist");
    }

    const followersCount = await User.countDocuments({ following: user._id });
    const followingCount = await User.countDocuments({ followers: user._id });
    const reelsCount = await Reel.countDocuments({ user: user._id });

    const accessToken = user.createAccessToken();
    const refreshToken = user.createRefreshToken();

    res.status(StatusCodes.OK).json({
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
  } catch (error) {
    console.error(error);
    throw new UnauthenticatedError("Invalid Token or expired");
  }
};

const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    throw new BadRequestError("Refresh token is required");
  }

  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    throw new Error("REFRESH_TOKEN_SECRET is not defined");
  }

  try {
    const payload = jwt.verify(refresh_token, secret) as { userId: string };
    const user = await User.findById(payload.userId);

    if (!user) {
      throw new UnauthenticatedError("Invalid refresh token");
    }

    const newAccessToken = user.createAccessToken();
    const newRefreshToken = user.createRefreshToken();

    res.status(StatusCodes.OK).json({
      tokens: { access_token: newAccessToken, refresh_token: newRefreshToken },
    });
  } catch (error) {
    console.error(error);
    throw new UnauthenticatedError("Invalid refresh token");
  }
};

export {
  signInWithOauth,
  signUpWithOauth,
  refreshToken,
  checkUsernameAvailability,
};
