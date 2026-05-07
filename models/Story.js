const mongoose = require('mongoose');

const storySchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mediaUrl: { type: String, required: true },
  type: { type: String, enum: ['image', 'video'], required: true },
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

// TTL index to automatically delete stories after 24 hours (86400 seconds)
storySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const Story = mongoose.model('Story', storySchema);
module.exports = Story;
