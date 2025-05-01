import express, { response } from 'express';
import Banner from '../models/bannerModel.js';

const router = express.Router();

export default router.get('/', async (req, res) => {
    try {
        const banners = await Banner.find();
        if (!banners) return res.status(404).json({ message: "No banners found" });
        return res.status(200).json({ message: "Banners fetch Successfully", data: banners })
    } catch (error) {
        res.status(400).json({ message: "Internal server error", error: error })
    }
});