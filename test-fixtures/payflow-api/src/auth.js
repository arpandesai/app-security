const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  req.user = jwt.decode(token);
  if (!req.user) return res.status(401).end();
  next();
};
