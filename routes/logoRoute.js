import express from "express";
import { Logo } from "../models/logoModel.js";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import { userAuth } from "../models/userModel.js";
import { PanelData } from "../models/PanelDataModel.js";
import path from 'path'

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "logo",
    allowed_formats: ["jpeg", "jpg", "png"],
    transformation: [{ width: 500, height: 500, crop: "limit" }],
  },
});

const upload = multer({ storage });

router.post("/", upload.single("logo"), async (req, res) => {
  try {
    const user = await userAuth.findById(req.user.userID);
    const panelDataId = user.PanelData;

    if (!panelDataId) {
      return res.status(404).json({ message: "Panel Data not found" });
    }

    const image = req.file?.path;

    if (!image) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const existingLogo = await Logo.findOne();
    if (existingLogo) {
      return res
        .status(400)
        .json({ message: "Logo already exists. Use PUT to update." });
    }

    const newLogo = Logo.create({ image });
    await PanelData.findByIdAndUpdate(panelDataId,{
      $push : { logo : await newLogo._id}
    })   

    return res
      .status(201)
      .json({ message: "Logo created successfully", image: newLogo.image });
  } catch (error) {
    console.error("Error creating logo:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/", upload.single("logo"), async (req, res) => {
  try {
    if (!req.user || !req.user.userID) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await userAuth.findById(req.user.userID);
    const panelDataId = user.PanelData;

    if (!panelDataId) {
      return res.status(404).json({ message: "Panel Data not found" });
    }

    const image = req.file?.path;

    if (!image) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    let logo = await Logo.findOne();

    if (logo) {
      // Extract public ID and delete the old image from Cloudinary
      const publicId = path.basename(logo.image, path.extname(logo.image));
      await cloudinary.uploader.destroy(`logo/${publicId}`);

      // Update logo document with new image
      logo.image = image;
      await logo.save();

      // Add logo reference to PanelData if not already added
      await PanelData.findByIdAndUpdate(panelDataId, {
        $addToSet: { logo: logo._id },
      });

      return res.status(200).json({
        message: "Logo updated successfully",
        image: logo.image,
      });
    } else {
      // Create new logo and link to PanelData
      const newLogo = new Logo({ image });
      await newLogo.save();

      await PanelData.findByIdAndUpdate(panelDataId, {
        $addToSet: { logo: newLogo._id },
      });

      return res.status(201).json({
        message: "Logo created successfully",
        image: newLogo.image,
      });
    }
  } catch (error) {
    console.error("Error updating/creating logo:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});


router.get("/", async (req, res) => {
  try {
    const user = await userAuth.findById(req.user.userID).populate({
      path: "PanelData",
      populate: { path: "logo" },
    });

    if (!user || !user.PanelData || !user.PanelData.logo) {
      return res.status(404).json({ message: "Logo not found" });
    }

    const logo = user.PanelData.logo;
    const logoData = Array.isArray(logo) && logo.length > 0
      ? logo[logo.length - 1]
      : !Array.isArray(logo)
        ? logo
        : null;

    if (!logoData || !logoData.image) {
      return res.status(404).json({ message: "Logo image not found" });
    }

    return res.status(200).json({ image: logoData.image });
  } catch (error) {
    console.error("Error fetching logo:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});



export default router;
