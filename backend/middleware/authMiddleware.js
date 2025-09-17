  import jwt from "jsonwebtoken";

  export const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) return res.status(403).json({ msg: "No token provided" });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // attach payload (id, role) to req
      next();
    } catch (err) {
      return res.status(401).json({ msg: "Unauthorized", error: err.message });
    }
  };

  export const isAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Admin access only" });
    }
    next();
  };