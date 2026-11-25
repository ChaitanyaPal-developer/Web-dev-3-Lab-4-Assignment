const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { jwtSecret } = require("../config");
const { getDB } = require("../db");

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const payload = jwt.verify(token, jwtSecret);
    if (!ObjectId.isValid(payload.userId)) {
      return res.status(401).json({ message: "Invalid token" });
    }
    const user = await getDB().collection("users").findOne(
      { _id: new ObjectId(payload.userId) },
      { projection: { password: 0 } }
    );
    if (!user) return res.status(401).json({ message: "User no longer exists" });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
