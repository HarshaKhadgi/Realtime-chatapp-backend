const Chat = require('../models/Chat');
const User = require('../models/User');

// @desc    Create or fetch One to One Chat
// @route   POST /api/chats
// @access  Private
// @notes   This is a deeply complex DB query that strictly guarantees NO duplicate 1-on-1 chat rooms are ever generated between two users.
const accessChat = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'userId param not sent with request' });
  }

  // Look for any existing 1-on-1 chat exactly containing BOTH the requesting user AND the target user using deep $elemMatch arrays
  var isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  }).populate('users', '-password').populate('latestMessage');

  isChat = await User.populate(isChat, {
    path: 'latestMessage.sender',
    select: 'username profilePic email',
  });

  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    var chatData = {
      chatName: 'sender',
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate('users', '-password');
      res.status(200).json(FullChat);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
};

// @desc    Fetch all chats for a user
// @route   GET /api/chats
// @access  Private
const fetchChats = async (req, res) => {
  try {
    let results = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });

    results = await User.populate(results, {
      path: 'latestMessage.sender',
      select: 'username profilePic email',
    });

    res.status(200).send(results);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Create New Group Chat
// @route   POST /api/chats/group
// @access  Private
const createGroupChat = async (req, res) => {
  if (!req.body.users || !req.body.name) {
    return res.status(400).send({ message: 'Please fill all the fields' });
  }

  var users = JSON.parse(req.body.users);
  if (users.length < 2) {
    return res.status(400).send('More than 2 users are required to form a group chat');
  }

  users.push(req.user);

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    res.status(200).json(fullGroupChat);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Add User to Group
// @route   PUT /api/chats/groupadd
// @access  Private
const addToGroup = async (req, res) => {
  const { chatId, userId } = req.body;

  const added = await Chat.findByIdAndUpdate(
    chatId,
    { $push: { users: userId } },
    { new: true }
  )
    .populate('users', '-password')
    .populate('groupAdmin', '-password');

  if (!added) {
    res.status(404).json({ message: 'Chat Not Found' });
  } else {
    res.json(added);
  }
};

// @desc    Remove User from Group
// @route   PUT /api/chats/groupremove
// @access  Private
const removeFromGroup = async (req, res) => {
  const { chatId, userId } = req.body;

  const removed = await Chat.findByIdAndUpdate(
    chatId,
    { $pull: { users: userId } },
    { new: true }
  )
    .populate('users', '-password')
    .populate('groupAdmin', '-password');

  if (!removed) {
    res.status(404).json({ message: 'Chat Not Found' });
  } else {
    res.json(removed);
  }
};

module.exports = { accessChat, fetchChats, createGroupChat, removeFromGroup, addToGroup };
