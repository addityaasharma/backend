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
import slugify from "slugify";

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

    const { title, content, category, } = req.body;
    const author = req.user.userID;
    const imageFile = req.file?.buffer;

    // Validate required fields
    if (!title || !content || !category || !author) {
      return res.status(400).json({ message: "Title, content, category, and author are required." });
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
        .json({ message: "Category exists but is not part of your panel." });
    }

    let imageUrl = null;
    if (imageFile) {
      const result = await streamUpload(imageFile);
      imageUrl = result.secure_url; // Get the URL of the uploaded image
    }

    // Generate a unique slug for the news article based on the title
    const link = slugify(title, { lower: true, strict: true });

    // Create the news article
    const news = await News.create({
      title,
      content,
      author,
      image: imageUrl,
      category: existCategory._id,
      link,  // Save the generated link (URL) for easy access
    });

    // Add the news article to the user's PanelData
    await PanelData.findByIdAndUpdate(panelDataId, {
      $push: { news: news._id },
    });

    // Respond with the newly created news article
    res.status(201).json({
      message: "News article posted successfully",
      news: { ...news.toObject(), link },  // Include the generated link in the response
    });
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
    const { title, content, category, author } = req.body;
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
    // if (author) news.author = author;
    if (author && mongoose.Types.ObjectId.isValid(author)) {
      news.author = new mongoose.Types.ObjectId(author);
    }
    

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
        populate: [
          { path: "category", select: "name" },  // Populate the category name
          { path: "author" },  // Populate author (if needed)
        ],
      },
    });

    if (!user || !user.PanelData) {
      return res.status(404).json({ message: "No news articles found." });
    }

    // Extract the news articles
    const newsArticles = user.PanelData.news || [];

    // Check if there are any news articles in the user's panel data
    if (newsArticles.length === 0) {
      return res.status(404).json({ message: "No news articles in your panel." });
    }

    res.status(200).json({
      message: "News articles fetched successfully",
      newsArticles,  // ✅ All populated fields included here
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
