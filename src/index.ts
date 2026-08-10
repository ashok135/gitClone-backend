import express from "express";
import   healthRoutes from "./routes/healthRoutes";
import  projectRouters from "./routes/projectRoutes"


const app = express();
const PORT = process.env.PORT ?? 5000;
app.use(express.json());



 
app.use("/api/health", healthRoutes);
app.use("/api/project",projectRouters)
 

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

export default app;