import express from 'express';
import Category from '../models/CategoryModel.js';

const router = express.Router();

export default router.get('/',async(req,res)=>{
    try{
        const categories = await Category.find();
        if(!categories) return res.status(404).json({message : "No categories found"});
        return res.status(200).json({message : "Categories fetched", data : categories});
    }catch(err){
        res.status(404).json({message : 'Error fetching Categories', error : err})
    }
});