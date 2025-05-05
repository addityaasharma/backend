import express from 'express';
import News from '../models/NewsModel.js';
import { populate } from 'dotenv';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const news = await News.find()
            .populate('category', 'name')
            .populate('author', 'username');
        if (!news) {
            res.status(404).json({ message: 'No news found' })
        }
        return res.status(200).json({ message: news })
    } catch (err) {
        res.status(400).json({ messag: "Error fetching categories", error: err })
    }
})

export default router;