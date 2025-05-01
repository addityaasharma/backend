import mongoose, { Schema } from "mongoose";
import { ref } from "vue";

const newSchema = new mongoose.Schema({
    title: { type: String, required: true },  
    content: { type: String, required: true },
    image: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    createdAt: { type: Date, default: Date.now }
});

const News = mongoose.model('News',newSchema);
export default News;