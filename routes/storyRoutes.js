const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { getStories, uploadStory, viewStory } = require('../controllers/storyController');
const upload = require('../utils/s3');

const router = express.Router();

router.route('/').get(protect, getStories);
// Use the 'upload' middleware array logic
router.post('/', protect, upload.single('media'), uploadStory);
router.put('/:storyId/view', protect, viewStory);

module.exports = router;
