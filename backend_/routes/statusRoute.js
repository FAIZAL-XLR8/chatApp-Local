const express = require("express");
const statusController = require("../controllers/statusController");
const {authMiddleware} = require("../middleware/authMiddleware");
const { multerMiddleware } = require("../config/cloudinary");

const statusRoute = express.Router();

// protected routes

// create status (with image/video upload)
statusRoute.post(
  "/",
  authMiddleware,
  multerMiddleware,
  statusController.createStatus
);

// get all statuses
statusRoute.get(
  "/",
  authMiddleware,
  statusController.getStatuses
);

// mark status as viewed
statusRoute.put(
  "/:statusId/view",
  authMiddleware,
  statusController.viewStatus
);

// delete status
statusRoute.delete(
  "/:statusId",
  authMiddleware,
  statusController.deleteStatus
);

module.exports = statusRoute;
