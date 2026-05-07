const Story = require('../models/Story');

// @desc    Get all active stories
// @route   GET /api/stories
// @access  Private
// @notes   Retrieves chronologically sorted active stories and cascades their underlying User/Viewer population graphs.
const getStories = async (req, res) => {
  try {
    // Queries all stories that have NOT been wiped by the TTL index in MongoDB
    // Populates both author (`user`) and the array of people who have seen it (`viewers`) natively!
    const stories = await Story.find()
      .populate('user', 'username profilePic')
      .populate('viewers', 'username')
      .sort({ createdAt: -1 });

    res.json(stories);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Upload a new story (image/video)
// @route   POST /api/stories
// @access  Private
const uploadStory = async (req, res) => {
  const { type } = req.body;
  const mediaUrl = req.file ? req.file.location : null;

  if (!mediaUrl || !type) {
    return res.status(400).json({ message: 'Media content and type are required' });
  }

  try {
    const story = await Story.create({
      user: req.user._id,
      mediaUrl,
      type,
    });

    res.status(201).json(story);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    View a story
// @route   PUT /api/stories/:storyId/view
// @access  Private
// @notes   Atomic array push operation logic that records Instagram-style story Viewers anonymously
const viewStory = async (req, res) => {
  try {
    // We strictly use $addToSet here: ensuring that if a user opens the same story 5 times, 
    // MongoDB organically guarantees they are only added to the array ONE distinct time!
    const story = await Story.findByIdAndUpdate(
      req.params.storyId,
      { $addToSet: { viewers: req.user._id } },
      { new: true }
    );
    res.json(story);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getStories, uploadStory, viewStory };
