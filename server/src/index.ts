import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
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

// API Routes (must be before the SPA catch-all)
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// --- Static Asset Serving & SPA Catch-all ---
// 1. Define the path to the root directory where index.html and other assets are.
const rootDir = path.join(__dirname, '..', '..');

// 2. Serve static files from the root directory.
// This will serve files like index.tsx, etc.
app.use(express.static(rootDir));

// 3. For any other GET request that hasn't been handled by API routes or static files,
// send back the main index.html file. This is the key for Single Page Application routing.
app.get('*', (req, res) => {
    res.sendFile(path.join(rootDir, 'index.html'));
});


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