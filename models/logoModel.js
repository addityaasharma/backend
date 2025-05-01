import mongoose, { mongo } from "mongoose";

const logoSchema = new mongoose.Schema({
    image : {
        type : String,
        required : true
    }
});

export const Logo = mongoose.model('logo', logoSchema)