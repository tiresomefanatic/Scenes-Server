import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthenticatedError, NotFoundError } from '../errors';
import User from '../models/User';

// Define the structure of the JWT payload
interface JwtPayload {
  userId: string;
  name: string;
}

// Extend the Express Request type
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    name: string;
  };
}

const auth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  // check header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer")) {
    throw new UnauthenticatedError("Authentication invalid");
  }
  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as JwtPayload;
    // attach the user to the job routes
    req.user = { userId: payload.userId, name: payload.name };

    const user = await User.findById(payload.userId);
   
    if (!user) {
      throw new NotFoundError("User not found");
    }
    next();
  } catch (error) {
    throw new UnauthenticatedError("Authentication invalid");
  }
};

export default auth;
