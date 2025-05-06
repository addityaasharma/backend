import express from 'express';
import Category from '../models/CategoryModel.js';

const router = express.Router();

router.get('/',async(req,res)=>{
    try{
        const categories = await Category.find();
        if(!categories) return res.status(404).json({message : "No categories found"});
        return res.status(200).json({message : "Categories fetched", data : categories});
    }catch(err){
        res.status(404).json({message : 'Error fetching Categories', error : err})
    }
});

router.get("/:link", async (req, res) => {
  try {
    const { link } = req.params;

    const article = await News.findOne({ link })
      .populate("category", "name")
      .populate("author", "username email");

    if (!article) {
      return res.status(404).json({ message: "Article not found." });
    }

    res.status(200).json({ article });
  } catch (err) {
    console.error("Error fetching article by link:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;