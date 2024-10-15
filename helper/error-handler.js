function errorHandler(err, req, res, next) {
  if (err.name === "Unauthorized") {
    // jwt authentication error
    return res.status(401).json({ message: "The user is not authorize" });
  }
  if (err.name === "ValidationError") {
    // validation error

    return res.status(401).json({ message: "The user is not validation" });
  }
  // default error
  return res.status(500).json(err);
}

module.exports = errorHandler;
