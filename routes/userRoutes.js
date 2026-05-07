const express = require('express');
const { registerUser, authUser, logoutUser, getUsers } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.route('/').post(registerUser).get(protect, getUsers);
router.post('/auth', authUser);
router.post('/logout', logoutUser);

module.exports = router;
