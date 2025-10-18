import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(403).json({ msg: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Unauthorized", error: err.message });
  }
};

export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ msg: "Admin access only" });
  }
  next();
};

export const optionalAuth = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      console.warn("Invalid token in optionalAuth:", err.message);
    }
  }
  next();
};
const userRequestCounts = new Map();

export const rateLimitByUser = (req, res, next) => {
  const userId = req.user?.id || req.ip;
  const currentTime = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const limit = 20; // max 20 requests per minute

  if (!userRequestCounts.has(userId)) {
    userRequestCounts.set(userId, []);
  }

  const timestamps = userRequestCounts.get(userId).filter(ts => currentTime - ts < windowMs);
  timestamps.push(currentTime);
  userRequestCounts.set(userId, timestamps);

  if (timestamps.length > limit) {
    return res.status(429).json({ msg: "Too many requests, slow down." });
  }

  next();
};
export const isAdminOrFaculty = (req, res, next) => {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "faculty")) {
    return res.status(403).json({ msg: "Admin or Faculty access only" });
  }
  next();
};
export const isAdminOrSelf = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ msg: "Unauthorized" });
  }

  const isAdmin = req.user.role === "admin";
  const isSelf = req.user.id === req.params.id;

  if (!isAdmin && !isSelf) {
    return res.status(403).json({ msg: "Access denied: Admin or account owner only" });
  }

  next();
};
export const isSameDepartment = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ msg: "Unauthorized" });
  }

  const userDept = req.user.department;
  const targetDept = req.params.department || req.body.department;

  if (!targetDept || userDept !== targetDept) {
    return res.status(403).json({ msg: "Access denied: Different department" });
  }

  next();
};

export const isFaculty = (req, res, next) => {
  if (!req.user || req.user.role !== "faculty") {
    return res.status(403).json({ msg: "Faculty access only" });
  }
  next();
};
export const isStudent = (req, res, next) => {
  if (!req.user || req.user.role !== "student") {
    return res.status(403).json({ msg: "Student access only" });
  }
  next();
};
// Add this to your existing middleware file
export const verifyTokenCookie = (req, res, next) => {
  // First try to get token from cookie (for page navigation)
  let token = req.cookies.token;
  
  // Fallback to header (for API calls from frontend)
  if (!token) {
    token = req.headers["authorization"]?.split(" ")[1];
  }

  if (!token) {
    return res.status(403).json({ msg: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Unauthorized", error: err.message });
  }
};

export const requireAuthPage = (req, res, next) => {
  // This middleware is for page requests (returns HTML)
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/auth/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // Clear invalid token and redirect to login
    res.clearCookie('token');
    return res.redirect('/auth/login');
  }
};