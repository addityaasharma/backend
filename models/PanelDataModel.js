import mongoose from "mongoose";

const panelDataSchema = new mongoose.Schema({
  categories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref : 'Category'
    },
  ],
  banners: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Banner",
    },
  ],
  logo : [
    {
      type : mongoose.Schema.Types.ObjectId,
      ref : 'logo'
    },
  ],
  news : [
    {
      type : mongoose.Schema.Types.ObjectId,
      ref : 'News',
    },
  ],
});

export const PanelData = mongoose.model("PanelData", panelDataSchema);
