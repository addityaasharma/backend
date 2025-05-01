import express from "express";
import { Logo } from "../models/logoModel.js";

const router = express.Router();

export default router.get('/',async(req,res)=>{
    try{
        const logo = await Logo.find();
        if(!logo){
            res.status(404).json({message : "No logos found"})
        }
        return res.status(200).json({message : "Fetched successfully", logo});
    } catch(error){
        return res.status(400).json({message  : "Internal Server Error"})
    }
});
