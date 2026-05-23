import jwt from "jsonwebtoken";

export function signToken(user) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required for token signing");
  }
  return jwt.sign({ id: user._id, role: user.role }, jwtSecret, {
    expiresIn: "7d"
  });
}
