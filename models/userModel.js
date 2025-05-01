import mongoose from 'mongoose';
import { PanelData } from './PanelDataModel.js';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true, // Corrected typo here
    },
    password: {
        type: String,
        required: true,
    },
    PanelData : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PanelData', // Refers to the PanelData model
        default: null,
    },
});

export const userAuth = mongoose.model('Credentials', userSchema);
