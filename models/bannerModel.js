// bannerModel.js
import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema({
  image: { type: String },
  public_id : String,
  link : String,
  banner: { type: String,},
});

const Banner = mongoose.model("Banner", bannerSchema);

export default Banner;