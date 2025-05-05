import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import Category from "../models/CategoryModel.js";
import News from "../models/NewsModel.js";
import { PanelData } from "../models/PanelDataModel.js";
import { userAuth } from "../models/userModel.js";
import authMiddleware from "../middleWare.js";

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "categories",
    allowed_formats: ["jpeg", "jpg", "png", "svg"],
    transformation: [{ width: 500, height: 500, crop: "limit" }],
  },
});

// const storage  = new CloudinaryStorage

const upload = multer({ storage });

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const user = await userAuth.findById(req.user.userID);
    const panelDataId = user.PanelData;

    if (!panelDataId) {
      return res.status(404).json({ message: "Panel Data not found" });
    }

    const { name } = req.body; 
    const image = req.file?.path;

    if (!name) {
      return res
        .status(400)
        .json({ message: "Please fill all the required fields" });
    }

    const category = await Category.create({ name, image });

    await PanelData.findByIdAndUpdate(panelDataId, {
      $push: { categories: category._id },
    });

    res
      .status(201)
      .json({ message: "Category created successfully", category });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ message: "Internal Server Error", error: err });
  }
});

router.put("/category/:_id", upload.single("image"), async (req, res) => {
  try {
    const { _id } = req.params;
    const { name: newName } = req.body;
    const image = req.file?.path;

    const user = await userAuth.findById(req.user.userID);
    if (!user) return res.status(404).json({ message: "User not found" });

    const category = await Category.findById(_id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    const panelData = await PanelData.findById(user.PanelData);
    if (!panelData)
      return res.status(403).json({ message: "Panel not found" });

    // Make sure user has access before allowing update
    if (!panelData.categories.includes(_id)) {
      return res.status(403).json({
        message: "You do not have permission to update this category",
      });
    }

    category.name = newName || category.name;
    category.image = image || category.image;
    await category.save();

    // Safely ensure category stays in panelData without duplication
    await PanelData.findByIdAndUpdate(panelData._id, {
      $addToSet: { categories: category._id },
    });

    res.status(200).json({
      message: "Category updated successfully",
      category,
    });
  } catch (err) {
    console.error("Error updating category:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});


router.delete("/category/:id", async (req, res) => {
  const { id } = req.params;

  if (!id || id === "undefined") {
    return res.status(400).json({ message: "Invalid category ID" });
  }

  try {
    const user = await userAuth.findById(req.user.userID);
    const category = await Category.findById(id);
    const panelData = await PanelData.findById(user?.PanelData);

    if (!category || !user) {
      return res.status(404).json({ message: "Category or user not found" });
    }

    if (!panelData || !panelData.categories.includes(id)) {
      return res.status(403).json({
        message: "You do not have permission to delete this category",
      });
    }

    await News.deleteMany({ category: id });

    let cloudinaryResult = null;
    if (category.image) {
      const publicId = category.image.split("/").slice(-1)[0].split(".")[0];
      cloudinaryResult = await cloudinary.uploader.destroy(
        `categories/${publicId}`
      );
    }

    await PanelData.findByIdAndUpdate(panelData._id, {
      $pull: { categories: id },
    });

    await category.deleteOne();

    res.status(200).json({
      message: "Category and related posts deleted successfully",
      category,
      cloudinaryResult,
    });
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ message: "Internal Server Error", error: err });
  }
});

router.get("/", async (req, res) => {
  try {
    const user = await userAuth.findById(req.user.userID).populate({
      path: "PanelData",
      populate: { path: "categories" },
    });

    if (!user || !user.PanelData) {
      return res.status(404).json({ message: "Panel data not found" });
    }

    res.status(200).json(user.PanelData.categories || []);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;
