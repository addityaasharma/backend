import express from "express";
import cloudinary from "../config/cloudinary.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import Banner from "../models/bannerModel.js";
import { userAuth } from "../models/userModel.js";
import { PanelData } from "../models/PanelDataModel.js";

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "banner",
    allowed_formats: ["jpeg", "jpg", "png", "svg"],
    transformation: [{ width: 500, height: 500, crop: "limit" }],
    resource_type: "image",
  },
});

const upload = multer({ storage });


router.post("/", upload.single("image"), async (req, res) => {
  try {
    const user = await userAuth.findById(req.user.userID);
    const panelDataId = user.PanelData;

    if (!panelDataId) {
      return res.status(400).json({ message: "Panel Data not found" });
    }

    const { link, userId } = req.body;
    const file = req.file;

    const banners = await Banner.create({
      image: file.path,
      public_id: file.filename, // cloudinary filename is public_id
      link: link.trim(),
    });

    await PanelData.findByIdAndUpdate(panelDataId, {
      $push: { banners: banners._id }
    })

    return res.status(201).json({
      message: "Banner created successfully",
      banner: banners,
    });
  } catch (error) {
    console.error("POST /banner error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const user = await userAuth.findById(req.user.userID).populate({
      path: "PanelData",
      populate: { path: "banners" },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.PanelData) {
      return res.status(404).json({ message: "Panel data not found" });
    }

    const userBanner = user.PanelData.banners || [];

    return res.status(200).json({
      message: "User banners fetched",
      info: userBanner,
    });
  } catch (error) {
    console.error("GET /banner error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});


router.put("/:_id", upload.single("image"), async (req, res) => {
  try {
    const user = await userAuth.findById(req.user.userID);
    const panelDataID = user.PanelData;

    const { _id } = req.params;
    const link = req.body.link?.trim();
    const file = req.file;

    const existBanner = await Banner.findById(_id);
    if (!existBanner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    if (file) {
      if (existBanner.public_id) {
        await cloudinary.uploader.destroy(existBanner.public_id); // Delete old image
      }

      existBanner.image = file.path;      // Cloudinary URL
      existBanner.public_id = file.filename;  // public_id used for deletion
    }

    if (link) {
      existBanner.link = link;
    }

    await existBanner.save();

    // Optional: Only push if not already present
    await PanelData.findByIdAndUpdate(panelDataID, {
      $addToSet: { banners: existBanner._id }
    });

    return res.status(200).json({
      message: "Banner updated successfully",
      banner: existBanner
    });
  } catch (error) {
    console.error("PUT /banner/:_id error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existBanner = await Banner.findById(id);
    if (!existBanner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    if (existBanner.public_id) {
      await cloudinary.uploader.destroy(existBanner.public_id);
    }

    await existBanner.deleteOne();

    return res.status(200).json({ message: "Banner deleted successfully" });
  } catch (error) {
    console.error("DELETE /banner/:id error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

export default router;
