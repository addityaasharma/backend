import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { userAuth } from "../models/userModel.js";
import dotenv from 'dotenv';
import { PanelData } from "../models/PanelDataModel.js"; // or correct path if different

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;


router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username or password missing" });
    }

    const existingUser = await userAuth.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashPass = await bcrypt.hash(password, 10);

    const panelData = await PanelData.create({}); //this will create my new panel Data

    const newUser = await userAuth.create({
      username,
      password: hashPass,
      PanelData : panelData._id,
    });

    res.status(201).json({ message: "User created successfully" });

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});


router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const user = await userAuth.findOne({ username }).populate('PanelData');
    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userID: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        username: user.username,
        _id: user._id,
        PanelData : user.PanelData,
      },
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
});


router.get('/logindetails', async (req, res) => {
  try {
    const data = await userAuth.find().select("username _id");
    if (!data.length) {
      return res.status(404).json({ message: "No users found" });
    }
    return res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
});

export default router;
