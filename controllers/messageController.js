const Message = require('../models/Message');
const User = require('../models/User');
const Chat = require('../models/Chat');

// @desc    Get all messages for a specific chat instance
// @route   GET /api/messages/:chatId
// @access  Private
// @notes   Executes multiple `.populate()` rounds to resolve deep User Object references inside the Message schema natively.
const allMessages = async (req, res) => {
  try {
    // 1. Fetch entire historical message array mapping strictly to the Chat's ObjectId
    // 2. Hydrate (populate) the `sender` ObjectId with their actual Profile data so the UI can render avatars natively.
    const messages = await Message.find({ chat: req.params.chatId })
      .populate('sender', 'username profilePic email')
      .populate('chat')
      .populate('replyTo');
    
    // AUTOMATIC READ RECEIPT FLUSH (Legacy Flow)
    // When a user successfully GETs this chat's messages, atomically update all historically sent messages 
    // inside this Chat room (that were NOT authored by them) and natively inject their User `_id` into the `readBy` array.
    // We use $addToSet instead of $push to ensure uniqueness (preventing duplicate array entries).
    await Message.updateMany(
      { chat: req.params.chatId, sender: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
      
    res.json(messages);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Persist a newly transmitted message to MongoDB
// @route   POST /api/messages
// @access  Private
// @notes   Takes a raw text/media payload and links it relationally to an active Chat document
const sendMessage = async (req, res) => {
  const { content, chatId, type, mediaUrl, replyTo } = req.body;

  if (!chatId) {
    return res.status(400).json({ message: 'Invalid data passed into request' });
  }

  var newMessage = {
    sender: req.user._id,
    content: content || 'Attachment',
    chat: chatId,
    type: type || 'text',
    mediaUrl: mediaUrl || '',
    replyTo: replyTo || null,
  };

  try {
    var message = await Message.create(newMessage);

    // Sequentially cascade populate the sender, chat, and nested chat participants
    message = await message.populate('sender', 'username profilePic');
    message = await message.populate('chat');
    message = await message.populate('replyTo');
    
    // Complex nested Mongoose population: since `chat` is resolved, we go inside `chat` and populate its `users` array.
    message = await User.populate(message, {
      path: 'chat.users',
      select: 'username profilePic email',
    });

    // Sync state boundary: Update the parent Chat document so it natively reflects this newly minted message as its `latestMessage`
    // This allows the Left-Sidebar to cleanly render the most recent snippet historically!
    await Chat.findByIdAndUpdate(req.body.chatId, {
      latestMessage: message,
    });

    res.json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const uploadMessageFile = async (req, res) => {
  const mediaUrl = req.file ? req.file.location : null;
  if (!mediaUrl) return res.status(400).json({ message: 'No file uploaded' });
  res.json({ url: mediaUrl });
};

const markAsRead = async (req, res) => {
  try {
    const { chatId } = req.body;
    
    // Explicit WhatsApp tick logic!
    // Triggers when a UI Client receives an active Socket message and silently pings this endpoint.
    // We execute an atomic NoSQL update sweeping the database to immediately mark unread messages as officially read!
    await Message.updateMany(
      { chat: chatId, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { allMessages, sendMessage, uploadMessageFile, markAsRead };
