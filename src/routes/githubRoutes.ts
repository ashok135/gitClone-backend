import express, { Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();

// GET /api/github/repos - Fetch authenticated user's GitHub repositories
router.get("/repos", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const githubToken = req.user?.githubToken;

    if (!githubToken) {
      res.status(400).json({ error: "GitHub access token is missing from user session." });
      return;
    }

    // Call GitHub's API to fetch the user's repositories
    const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
      headers: {
        "Authorization": `Bearer ${githubToken}`,
        "User-Agent": "mini-vercel-sandbox-backend",
        "Accept": "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(response.status).json({ 
        error: "Failed to fetch repositories from GitHub", 
        details: errText 
      });
      return;
    }

    const repos = await response.json() as Array<{
      id: number;
      name: string;
      full_name: string;
      private: boolean;
      html_url: string;
      description: string | null;
      updated_at: string;
    }>;

    // Filter and return only the relevant properties needed for Vercel-style UI
    const mappedRepos = repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      isPrivate: repo.private,
      url: repo.html_url,
      description: repo.description,
      updatedAt: repo.updated_at
    }));

    res.json(mappedRepos);

  } catch (error: any) {
    console.error("Fetch GitHub Repos Error:", error);
    res.status(500).json({ 
      error: "Internal Server Error while fetching GitHub repositories", 
      details: error.message 
    });
  }
});

export default router;
