import express, { Request, Response } from 'express';
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
app.use(cors({
    origin: '*', // Allow any origin for development purposes
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Explicitly allow necessary methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Explicitly allow necessary headers
}));
// FIX: This call had a "No overload matches" error due to type conflicts. Using the default express import resolves this.
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 media

// API Routes (must be before the SPA catch-all)
// FIX: This call had a "No overload matches" error due to type conflicts. Using the default express import resolves this.
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// --- Static Asset Serving & SPA Catch-all ---
// 1. Define the path to the root directory where index.html and other assets are.
const rootDir = path.join(__dirname, '..', '..');

// 2. Serve static files from the root directory.
// This will serve files like index.tsx, etc.
// We must explicitly set the Content-Type for .tsx files to a JavaScript MIME type
// so the browser will execute them as modules.
app.use(express.static(rootDir, {
    setHeaders: (res: http.ServerResponse, filePath: string) => {
        if (path.extname(filePath) === '.tsx') {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// 3. For any other GET request that hasn't been handled by API routes or static files,
// send back the main index.html file. This is the key for Single Page Application routing.
// FIX: Explicitly use express.Request and express.Response types to avoid global type conflicts and fix 'sendFile does not exist' error.
app.get('*', (req: Request, res: Response) => {
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