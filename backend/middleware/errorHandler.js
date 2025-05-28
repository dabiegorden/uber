// Enhanced error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error("Error details:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
  })

  // Database connection errors
  if (err.code === "ER_NO_SUCH_TABLE") {
    return res.status(500).json({
      success: false,
      message: "Database table not found. Please check your database schema.",
      error: process.env.NODE_ENV === "development" ? err.message : "Database error",
    })
  }

  // Database column errors
  if (err.code === "ER_BAD_FIELD_ERROR") {
    return res.status(500).json({
      success: false,
      message: "Database column not found. Please check your database schema.",
      error: process.env.NODE_ENV === "development" ? err.message : "Database error",
    })
  }

  // Authentication errors
  if (err.message === "Authentication required") {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    })
  }

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      error: err.message,
    })
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : "Server error",
  })
}

module.exports = errorHandler
