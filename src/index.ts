import "dotenv/config";
import express from "express";
import cors from "cors";
import healthRoutes from "./routes/healthRoutes";
import projectRouters from "./routes/projectRoutes";
import authRoutes from "./auth/authRoutes";
import githubRoutes from "./routes/githubRoutes";


const app = express();
const PORT = process.env.PORT ?? 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Express TypeScript backend running" });
});

app.use("/api/health", healthRoutes);
app.use("/api/project", projectRouters);
app.use("/api/auth", authRoutes);
app.use("/api/github", githubRoutes);

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

export default app;