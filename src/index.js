const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./http/routes/auth.routes');
const usersRoutes = require('./http/routes/users.routes');
const chatsRoutes = require('./http/routes/chats.routes');
const messagesRoutes = require('./http/routes/messages.routes');
const onlineRoutes = require('./http/routes/online.routes');

const { errorHandler } = require('./http/middleware/error.middleware');
const authMiddleware = require('./http/middleware/auth.middleware');
const chatsController = require('./http/controllers/chats.controller');

const SocketServer = require('./ws/socketServer');

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(cookieParser());

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.post('/chats/:chatId/delete', authMiddleware, chatsController.remove);
app.delete('/chats/:chatId', authMiddleware, chatsController.remove);
app.use('/chats', chatsRoutes);
app.use('/messages', messagesRoutes);
app.use('/online-users', onlineRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Centralized error handler
app.use(errorHandler);

const server = http.createServer(app);

const wsApi = SocketServer(server);

app.set('wsServer', wsApi);

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
