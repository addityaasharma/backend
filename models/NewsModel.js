import mongoose from "mongoose";

// Define the schema for the News model
const newSchema = new mongoose.Schema({
    title: { type: String, required: true },  
    content: { type: String, required: true },
    image: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Credentials' },  // Reference to User model
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    createdAt: { type: Date, default: Date.now }
});

// Create the News model using the schema
const News = mongoose.model('News', newSchema);
export default News;
