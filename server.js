const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const cors = require('cors');
const http = require('http');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Route imports
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const storyRoutes = require('./routes/storyRoutes');

// Connect to MongoDB
connectDB();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true, // Allow cookies
}));

app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stories', storyRoutes);


//hold
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },

});

app.get('/', (req, res) => {
  res.send('API is running...');
});

// =========================================
// SOCKET.IO REAL-TIME COMMUNICATION LOGIC
// =========================================
// This acts as the beating heart of the real-time chat application, securely
// piping events bi-directionally between UI clients and the server natively via WebSockets.
io.on('connection', (socket) => {
  console.log('Connected to socket.io', socket.id);

  // 1. Initial Handshake setup
  // When a user successfully logs into the React App, they transmit a setup ping.
  // We instantly subscribe their Socket connection strictly to their own MongoDB User _id.
  // This allows us to target them perfectly for incoming notifications natively!
  socket.on('setup', (userData) => {
    if (userData && userData._id) {
      socket.join(userData._id);
      console.log(`User ${userData._id} connected securely`);
      socket.emit('connected');
    }
  });

  // 2. Chat Room Subscription
  // When a user clicks to view a specific chat, they join a Socket "Room" defined exactly by the Chat's MongoDB _id.
  socket.on('join_chat', (room) => {
    socket.join(room);
    console.log('User Joined Chat Room: ' + room);
  });

  // 3. UX Indicators (Typing awareness)
  // Safely constrained to only emit back down strictly to clients inhabiting the current corresponding `room` ID
  socket.on('typing', (room) => socket.in(room).emit('typing', room));
  socket.on('stop_typing', (room) => socket.in(room).emit('stop_typing', room));

  // 4. WhatsApp Style Seen Receipts Sync
  // Passes the `messages_read` emit back to strictly the people inside the chat room so their CheckCheck icons shift explicitly to Blue.
  socket.on('mark_read', ({ chatId, userId }) => {
    socket.in(chatId).emit('messages_read', { chatId, userId });
  });

  // 5. Central Message Dispatch Pipeline
  // The moment anyone physically pushes a message down the Socket, we isolate the parent Chat.
  // Instead of flooding the chat room blindly, we explicitly map over the users and dispatch the chunk using socket.in(user._id).
  // This guarantees notifications hit users who are actively offline from the ChatBox component but still running the App globally!
  socket.on('new_message', (newMessageReceived) => {
    var chat = newMessageReceived.chat;
    if (!chat || !chat.users) return console.log('chat.users not defined');

    chat.users.forEach((user) => {
      // Prevent echoing the message right back to the original sender
      if (user._id == newMessageReceived.sender._id) return;
      socket.in(user._id).emit('message_received', newMessageReceived);
    });
  });

  socket.on('disconnect', () => {
    console.log('USER DISCONNECTED');
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
