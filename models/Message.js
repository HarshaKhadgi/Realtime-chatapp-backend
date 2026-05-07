const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: { type: String, trim: true },
  type: { type: String, enum: ['text', 'image', 'video', 'audio', 'file'], default: 'text' },
  mediaUrl: { type: String }, // For image/video/audio/file attachments
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
