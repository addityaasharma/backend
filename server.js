import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import categoryRoute from "./routes/categoryRoute.js";
import newsRoute from "./routes/newsRoutes.js";
import authRoute from "./routes/authRoute.js";
import logoRoute from "./routes/logoRoute.js";
import bannerRoute from "./routes/bannerRoute.js";
import os from "os";
import authMiddleware from "./middleWare.js";
import publicRoute from './routes/publicRoute.js'
import bannerRoutes from './routes/bannerPublicRoute.js'
import categoryRoutes from './routes/categoryPublicRoute.js'
import categoryPublicRoute from "./routes/categoryPublicRoute.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use("/uploads", express.static("uploads"));
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/categories", authMiddleware, categoryRoute);
app.use("/api/news", authMiddleware, newsRoute);
app.use("/api/auth", authRoute);
app.use("/api/logo", authMiddleware, logoRoute);
app.use("/api/banner", authMiddleware, bannerRoute);

// for public
app.use('/newsroutes',publicRoute);
app.use('/bannerroutes',bannerRoutes);
app.use('/categoryroutes',categoryPublicRoute);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err.message));

const getNetworkAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
};

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running at: http://${getNetworkAddress()}:${PORT}`);
});
