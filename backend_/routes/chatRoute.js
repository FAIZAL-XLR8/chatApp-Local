const express = require('express');
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');
const { multerMiddleware } = require('../config/cloudinaryConfig');

const chatRouter = express.Router();

// protected route
chatRouter.post(
  '/send-message',
  authMiddleware,
  multerMiddleware,
  chatController.sendMessage
);

chatRouter.get(
  '/conversations',
  authMiddleware,
  chatController.getConversation
);

chatRouter.get(
  '/conversations/:conversationId/messages',
  authMiddleware,
  chatController.getMessages
);

chatRouter.put(
  '/messages/read',
  authMiddleware,
  chatController.markAsRead
);

module.exports = chatRouter;
