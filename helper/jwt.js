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

    //Register/verify-email
    {
      pattern: /^\/api\/v1\/users\/register(\/|$)/,
      methods: ["POST"],
    },
    {
      pattern: /^\/api\/v1\/users\/verify-email(\/|$)/,
      methods: ["POST"],
    },
    //Forgot password
    {
      pattern: /^\/api\/v1\/client\/forgot-password(\/|$)/,
      methods: ["POST"],
    },
    {
      pattern: /^\/api\/v1\/client\/verify-otp(\/|$)/,
      methods: ["POST"],
    },
    {
      pattern: /^\/api\/v1\/client\/reset-password(\/|$)/,
      methods: ["POST"],
    },
    //Login
    {
      pattern: /^\/api\/v1\/users\/login(\/|$)/,
      methods: ["POST"],
    },
    //Order
    {
      pattern: /^\/api\/v1\/orders(\/|$)/,
      methods: ["POST"],
    },
    //Order
    {
      pattern: /^\/api\/v1\/orders(\/|$)/,
      methods: ["GET"],
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
// Non-admin routes for user access

async function isRevoked(req, payload, done) {
  // Define paths that non-admin users can access
  const nonAdminRoutes = [
    {
      path: /^\/users\/\w+\/cart\/\w+$/, // Matches /users/{id}/cart/{cartId}
      methods: ["DELETE"],
    },
    {
      path: /^\/users\/userCart\/\w+$/, // Matches /users/userCart/{id}
      methods: ["POST"],
    },
    {
      path: /^\/users\/\w+\/cart\/\w+$/, // Matches /users/{id}/cart/{cartId}
      methods: ["PUT"],
    },
  ];

  // Check if the request matches any non-admin routes
  const isNonAdminRoute = nonAdminRoutes.some(({ path, methods }) => {
    return path.test(req.path) && methods.includes(req.method);
  });

  // If the route is a non-admin route, allow access regardless of admin status
  if (isNonAdminRoute) {
    return done(); // Allow access
  }

  const adminProtectedRoutes = [
    {
      pattern: /^\/api\/v1\/products(\/|$)/,
      methods: ["POST", "DELETE", "PUT"],
    },
    {
      pattern: /^\/api\/v1\/restaurants(\/|$)/,
      methods: ["POST", "DELETE", "PUT"],
    },
    {
      pattern: /^\/api\/v1\/users(\/|$)/,
      methods: ["DELETE", "PUT"],
    },
    {
      pattern: /^\/api\/v1\/attributes(\/|$)/,
      methods: ["POST", "DELETE", "PUT"],
    },
    {
      pattern: /^\/api\/v1\/category(\/|$)/,
      methods: ["POST", "DELETE", "PUT"],
    },
    {
      pattern: /^\/api\/v1\/orders(\/|$)/,
      methods: ["DELETE", "PUT"],
    },
  ];

  // Check if the request matches any admin protected routes
  const isAdminRoute = adminProtectedRoutes.some(({ pattern, methods }) => {
    return pattern.test(req.path) && methods.includes(req.method);
  });

  if (isAdminRoute && !payload.isAdmin) {
    // If the route requires admin access and the user is not an admin
    return done(null, true); // Revoke access
  }

  // If it is not an admin route or the user is an admin
  done(); // Allow access
}

module.exports = authJwt;
