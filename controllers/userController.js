const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
// @notes   Handles formal user creation and automatically mints an HttpOnly JWT cookie session
const registerUser = async (req, res) => {
  try {
    const { username, email, password, bio, profilePic } = req.body;

    // 1. Uniqueness Guard: Query MongoDB to ensure the email address doesn't already exist natively
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 2. Data Insertion: Triggers the Mongoose `pre('save')` hook natively which bcrypt hashes the raw password!
    const user = await User.create({
      username,
      email,
      password,
      bio,
      profilePic,
    });

    if (user) {
      // 3. Session Minting: Generate and append an HttpOnly Secure JSON Web Token to the Res Headers
      generateToken(res, user._id);

      // 4. Return clean mapped data (omitting the hashed password for network security)
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePic: user.profilePic,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/auth
// @access  Public
const authUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      generateToken(res, user._id);
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePic: user.profilePic,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/users/logout
// @access  Public
const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Get user profile / Search users
// @route   GET /api/users
// @access  Private
// @notes   Exposes a dynamic search engine leveraging MongoDB Regex rules for global chat user indexing
const getUsers = async (req, res) => {
  try {
    // MongoDB Regular Expression pipeline: Matches case-insensitive ('i') strings natively anywhere inside the field
    const keyword = req.query.search
      ? {
        $or: [
          { username: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
        ],
      }
      : {};

    // 1. Executes the keyword match safely 
    // 2. Chained with $ne (Not Equal) isolating specifically to exclude the currently logged-in requesting user
    // 3. Select('-password') ensures catastrophic data leaks don't happen globally
    const users = await User.find(keyword).find({ _id: { $ne: req.user._id } }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { registerUser, authUser, logoutUser, getUsers };

