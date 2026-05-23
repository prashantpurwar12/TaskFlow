import express from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";
import User from "../models/User.js";
import { signToken } from "../utils/token.js";

const router = express.Router();

const authResponse = (user) => ({
  token: signToken(user),
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});

router.post(
  "/signup",
  [
    body("name").trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("role").optional().isIn(["Admin", "Manager", "Member"]).withMessage("Invalid role selection")
  ],
  validate,
  async (req, res, next) => {
    try {
      const existing = await User.findOne({ email: req.body.email });
      if (existing) {
        return res.status(409).json({ message: "Email is already registered" });
      }

      const isFirstUser = (await User.countDocuments()) === 0;
      const user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        role: req.body.role || (isFirstUser ? "Admin" : "Member")
      });

      res.status(201).json(authResponse(user));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required")
  ],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findOne({ email: req.body.email }).select("+password");
      if (!user || !(await user.comparePassword(req.body.password))) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      res.json(authResponse(user));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
