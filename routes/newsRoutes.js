import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import News from "../models/NewsModel.js";
import Category from "../models/CategoryModel.js";
import mongoose from "mongoose";
import streamifier from "streamifier";
import { userAuth } from "../models/userModel.js";
import { PanelData } from "../models/PanelDataModel.js";
import { populate } from "dotenv";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

const streamUpload = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: "news_images",
        transformation: [{ width: 500, height: 500, crop: "limit" }],
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const user = await userAuth.findById(req.user.userID);
    const panelDataId = user.PanelData;

    if (!panelDataId) {
      return res.status(404).json({ message: "Panel Data not found" });
    }

    const { title, content, category } = req.body;
    const imageFile = req.file?.buffer;

    if (!title || !content || !category) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existCategory = await Category.findOne({ name: category });
    if (!existCategory) {
      return res.status(404).json({ message: "Category not found." });
    }

    const panelData = await PanelData.findById(panelDataId);

    const isCategoryInPanel = panelData.categories.some((catId) =>
      catId.equals(existCategory._id)
    );

    if (!isCategoryInPanel) {
      return res
        .status(403)
        .json({ message: "Category exists but not in your panel." });
    }

    let imageUrl = null;
    if (imageFile) {
      const result = await streamUpload(imageFile);
      imageUrl = result.secure_url;
    }

    const news = await News.create({
      title,
      content,
      image: imageUrl,
      category: existCategory._id.name,
    });

    await PanelData.findByIdAndUpdate(panelDataId, {
      $push: { news: news._id },
    });

    res.status(201).json({ message: "News article posted successfully", news });
  } catch (err) {
    console.error("Error creating news article:", err);
    res.status(500).json({
      message: "Failed to create news article",
      error: err.message,
    });
  }
});

router.put("/editnews/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category } = req.body;
    const imageFile = req.file?.buffer;

    if (!id || id === "undefined") {
      return res.status(400).json({ message: "Invalid news ID" });
    }

    const user = await userAuth.findById(req.user?.userID);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const news = await News.findById(id);
    if (!news) {
      return res.status(404).json({ message: "News article not found" });
    }

    const panelData = await PanelData.findById(user.PanelData);
    if (!panelData || !panelData.news.includes(news._id)) {
      return res.status(403).json({
        message: "You do not have permission to update this news article",
      });
    }

    if (category) {
      let existCategory = null;

      if (mongoose.Types.ObjectId.isValid(category)) {
        existCategory = await Category.findById(category);
      }

      if (!existCategory) {
        existCategory = await Category.findOne({ name: category });
      }

      if (!existCategory) {
        return res.status(404).json({ message: "Category not found" });
      }

      news.category = existCategory._id;
    }

    if (title) news.title = title;
    if (content) news.content = content;

    if (imageFile) {
      const result = await streamUpload(imageFile);
      news.image = result.secure_url;
    }

    await news.save();

    return res.status(200).json({
      message: "News article updated successfully",
      news,
    });
  } catch (err) {
    console.error("Error updating news:", err);
    return res.status(500).json({
      message: "Failed to update news",
      error: err.message,
    });
  }
});

router.delete("/deletenews/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id === "undefined") {
      return res.status(400).json({ message: "Invalid or missing news ID" });
    }

    const user = await userAuth.findById(req.user.userID);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const panelData = await PanelData.findById(user.PanelData);
    if (!panelData) {
      return res.status(404).json({ message: "PanelData not found" });
    }

    const news = await News.findById(id);
    if (!news) {
      return res.status(404).json({ message: "News article not found" });
    }

    if (!panelData.news.includes(news._id)) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this news" });
    }

    if (news.image) {
      const publicId = news.image.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`news_images/${publicId}`);
    }

    await PanelData.findByIdAndUpdate(panelData._id, {
      $pull: { news: news._id },
    });

    await news.deleteOne();
    res.status(200).json({ message: "News article deleted successfully" });
  } catch (err) {
    console.error("Error deleting news:", err);
    res.status(500).json({
      message: "Failed to delete news",
      error: err.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const user = await userAuth.findById(req.user.userID).populate({
      path: "PanelData",
      populate: {
        path: "news",
        populate: { path: "category", select: "name" }
      }
    });

    if (!user || !user.PanelData) {
      return res.status(404).json({ message: "No news articles found." });
    }

    res.status(200).json({
      message: "News articles fetched successfully",
      newsArticles: user.PanelData.news, // ✅ lowercase "news"
    });
  } catch (err) {
    console.error("Error fetching news articles:", err);
    res.status(500).json({
      message: "Failed to fetch news articles",
      error: err.message,
    });
  }
});

export default router;
