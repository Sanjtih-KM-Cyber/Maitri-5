import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db';
import authRoutes from './routes/auth';
import apiRoutes from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 media

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

const server = http.createServer(app);

// Socket.IO Setup
export const io = new Server(server, {
  cors: {
    origin: '*', // In production, restrict this to your frontend URL
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
