import express, { Request, Response } from "express";

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

    // 3. Return user profile and token to frontend
    res.json({
      token: access_token,
      user: {
        username: userData.login,
        id: userData.id,
        name: userData.name || userData.login,
        avatarUrl: userData.avatar_url,
        profileUrl: userData.html_url,
        email: userData.email,
      }
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

    const user = {
      username: userData.login,
      id: userData.id,
      name: userData.name || userData.login,
      avatarUrl: userData.avatar_url,
      profileUrl: userData.html_url,
      email: userData.email,
    };

    // 3. Redirect back to frontend with user data and token in query string
    const encodedUser = encodeURIComponent(JSON.stringify(user));
    res.redirect(`${frontend_url}?token=${access_token}&user=${encodedUser}`);

  } catch (error: any) {
    console.error("GitHub Callback Error:", error);
    res.status(500).send("Internal Server Error during callback handling");
  }
});

export default router;
