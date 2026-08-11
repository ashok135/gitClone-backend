import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    githubToken: string;
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Access denied. No token provided." });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const jwtSecret = process.env.JWT_SECRET || "your_fallback_jwt_secret";
    const decoded = jwt.verify(token, jwtSecret) as {
      id: number;
      email: string;
      name: string;
      githubToken: string;
    };

    // Attach decoded user info (including githubToken) to the request object
    (req as AuthenticatedRequest).user = decoded;
    
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}
