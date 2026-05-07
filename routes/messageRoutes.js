const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { allMessages, sendMessage, uploadMessageFile, markAsRead } = require('../controllers/messageController');
const upload = require('../utils/s3');

const router = express.Router();

router.route('/:chatId').get(protect, allMessages);
router.put('/read', protect, markAsRead);
router.post('/upload', protect, upload.single('media'), uploadMessageFile);
router.route('/').post(protect, sendMessage);

module.exports = router;
