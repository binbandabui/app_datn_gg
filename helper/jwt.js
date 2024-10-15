const expressJwt = require("express-jwt");

function authJwt() {
  const secret = process.env.secret;

  // Define exact paths to exclude from JWT authentication
  const excludedPaths = new Set([
    "/api/v1/users/login",
    "/api/v1/users/register",
  ]);

  // Define regex patterns for paths and methods to exclude from JWT authentication
  const excludedPathPatterns = [
    {
      pattern: /^\/api\/v1\/products(\/|$)/,
      methods: ["GET"],
    },
    {
      pattern: /^\/api\/v1\/category(\/|$)/,
      methods: ["GET"],
    },
    {
      pattern: /^\/api\/v1\/favorites(\/|$)/,
      methods: ["GET"],
    },
    {
      pattern: /^\/api\/v1\/attributes(\/|$)/,
      methods: ["GET"],
    },
    {
      pattern: /^\/api\/v1\/restaurants(\/|$)/,
      methods: ["GET"],
    },

    {
      pattern: /^\/public\/uploads(\/|$)/,
      methods: ["GET"],
    },

    {
      pattern: /^\/api\/v1\/users\/edituser(\/|$)/,
      methods: ["PUT"],
    },
    {
      pattern: /^\/api\/v1\/favorites\/edituser(\/|$)/,
      methods: ["PUT"],
    },
    //Register
    {
      pattern: /^\/api\/v1\/users\/register(\/|$)/,
      methods: ["POST"],
    },
    //Forgot password
    {
      pattern: /^\/api\/v1\/users\/forgot-password(\/|$)/,
      methods: ["POST"],
    },
    {
      pattern: /^\/api\/v1\/users\/verify-otp(\/|$)/,
      methods: ["POST"],
    },
    {
      pattern: /^\/api\/v1\/users\/reset-password(\/|$)/,
      methods: ["POST"],
    },
    //Login
    {
      pattern: /^\/api\/v1\/users\/login(\/|$)/,
      methods: ["POST"],
    },
  ];

  return (req, res, next) => {
    // Check if the request path matches any of the excluded paths
    if (excludedPaths.has(req.path)) {
      return next(); // Skip JWT authentication for excluded paths
    }

    // Check if the request path and method match any of the excluded patterns
    const isExcluded = excludedPathPatterns.some(
      ({ pattern, methods }) =>
        pattern.test(req.path) && methods.includes(req.method)
    );

    if (isExcluded) {
      return next(); // Skip JWT authentication for excluded paths and methods
    }

    // Apply the JWT middleware for all other paths and methods
    expressJwt({
      secret,
      algorithms: ["HS256"],
      isRevoked: isRevoked,
    })(req, res, next); // Ensure correct usage of expressJwt
  };
}
async function isRevoked(req, payload, done) {
  if (!payload.isAdmin) {
    done(null, true);
  }
  done();
}
module.exports = authJwt;
