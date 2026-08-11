import "dotenv/config";
import express, { Request, Response } from "express";

import  jwt from "jsonwebtoken"
import prisma from "../config/db/prisma";

const router = express.Router();

// POST /github endpoint to exchange authorization code for access token and profile
router.post("/github", async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ error: "Authorization code is required" });
      return;
    }

    const client_id = process.env.GITHUB_CLIENT_ID;
    const client_secret = process.env.GITHUB_CLIENT_SECRET;

    if (!client_id || !client_secret) {
      res.status(500).json({ 
        error: "GitHub client configuration is missing on the server" 
      });
      return;
    }

    // 1. Exchange temporary code for an access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code,
      }),
    });

    console.log(tokenResponse)

    const tokenData = await tokenResponse.json() as { 
      access_token?: string; 
      error?: string; 
      error_description?: string;
    };

    if (tokenData.error || !tokenData.access_token) {
      res.status(400).json({ 
        error: tokenData.error || "Failed to exchange authorization code for access token",
        description: tokenData.error_description 
      });
      return;
    }

    const { access_token } = tokenData;

    // 2. Fetch the user profile from GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "User-Agent": "mini-vercel-sandbox-backend",
      },
    });

    if (!userResponse.ok) {
      res.status(userResponse.status).json({ 
        error: "Failed to retrieve user profile from GitHub" 
      });
      return;
    }

    const userData = await userResponse.json() as {
      login: string;
      id: number;
      avatar_url: string;
      name: string | null;
      email: string | null;
      html_url: string;
    };

    // 3. Find or Create the User in your database
    const email = userData.email || `${userData.login}@github.com`;
    
    let dbUser = await prisma.user.findUnique({
      where: { email }
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email,
          name: userData.name || userData.login
        }
      });
    }

    // 4. Sign your own custom backend JWT token
    const jwtSecret = process.env.JWT_SECRET || "your_fallback_jwt_secret";
    const userPayload = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      username: userData.login,
      avatarUrl: userData.avatar_url,
      profileUrl: userData.html_url,
    };
    
    const backendToken = jwt.sign(
      { 
        ...userPayload,
        githubToken: access_token
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    // 5. Return your JWT and Database User to the React app
    res.json({
      token: backendToken,
      user: userPayload
    });

  } catch (error: any) {
    console.error("GitHub Auth Error:", error);
    res.status(500).json({ 
      error: "Internal Server Error during authentication",
      details: error.message 
    });
  }
});

// GET /github/callback endpoint to handle backend callback redirect
router.get("/github/callback", async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.query;

    if (!code) {
      res.status(400).send("Authorization code is required");
      return;
    }

    const client_id = process.env.GITHUB_CLIENT_ID;
    const client_secret = process.env.GITHUB_CLIENT_SECRET;
    const frontend_url = process.env.FRONTEND_URL || "http://localhost:5173";

    if (!client_id || !client_secret) {
      res.status(500).send("GitHub client configuration is missing on the server");
      return;
    }

    // 1. Exchange temporary code for an access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as { 
      access_token?: string; 
      error?: string;
    };

    if (tokenData.error || !tokenData.access_token) {
      res.status(400).send("Failed to exchange authorization code for access token");
      return;
    }

    const { access_token } = tokenData;

    // 2. Fetch the user profile from GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "User-Agent": "mini-vercel-sandbox-backend",
      },
    });

    if (!userResponse.ok) {
      res.status(userResponse.status).send("Failed to retrieve user profile from GitHub");
      return;
    }

    const userData = await userResponse.json() as {
      login: string;
      id: number;
      avatar_url: string;
      name: string | null;
      email: string | null;
      html_url: string;
    };
   
      // 3. Find or Create the User in your database
    const email = userData.email || `${userData.login}@github.com`;
    
    let dbUser = await prisma.user.findUnique({
      where: { email }
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email,
          name: userData.name || userData.login
        }
      });
    }

    // 4. Sign your own custom backend JWT token
    const jwtSecret = process.env.JWT_SECRET || "your_fallback_jwt_secret";
    const userPayload = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      username: userData.login,
      avatarUrl: userData.avatar_url,
      profileUrl: userData.html_url,
    };
    
    const backendToken = jwt.sign(
      { 
        ...userPayload,
        githubToken: access_token
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    // 5. Redirect back to frontend with your JWT and DB User info
    const encodedUser = encodeURIComponent(JSON.stringify(userPayload));
    res.redirect(`${frontend_url}?token=${backendToken}&user=${encodedUser}`);

  } catch (error: any) {
    console.error("GitHub Callback Error:", error);
    res.status(500).send("Internal Server Error during callback handling");
  }
});

export default router;
