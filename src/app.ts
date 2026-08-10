import app from "./index.js";
import cors from "cors";

app.use(cors());

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Express TypeScript backend running" });
});
