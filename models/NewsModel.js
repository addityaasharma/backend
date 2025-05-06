import mongoose from "mongoose";
import slugify from "slugify";

// Define the schema for the News model
const newSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Credentials' },  // Reference to User model
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  createdAt: { type: Date, default: Date.now },
  link: { type: String, unique: true }
});

// Pre-save hook to generate the link
newSchema.pre('save', function (next) {
  if (this.isModified('title') || this.isNew) {
    this.link = slugify(this.title, { lower: true, strict: true }); // Generate link from title
  }
  next();
});

// Create the News model using the schema
const News = mongoose.model('News', newSchema);
export default News;
