// Composizione dell'app Express: middleware, static, API, error handling
const express = require("express");
const cors = require("cors");
const path = require("path");
const apiRoutes = require("./routes");
const { errorHandler } = require("./middleware/errorHandler");

function creaApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "..", "..", "frontend")));

  app.use("/api", apiRoutes);

  app.use(errorHandler);

  return app;
}

module.exports = creaApp;
