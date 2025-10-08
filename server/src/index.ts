import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './db';
import authRoutes from './routes/auth';
import apiRoutes from './routes/api';

dotenv.config();

// FIX: Add __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Initialize and export 'io' for other modules to use.
export const io = new Server(server, {
  cors: {
    origin: '*', // In production, restrict this to your frontend URL
    methods: ['GET', 'POST'],
  },
});

// Connect to Database
connectDB();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// --- Static Asset Serving & SPA Catch-all ---
const rootDir = path.join(__dirname, '..', '..');

// Serve static files from the project root.
app.use(express.static(rootDir, {
    // FIX: Add explicit `Response` type to resolve `setHeader` error.
    setHeaders: (res: Response, filePath) => {
        if (path.extname(filePath) === '.tsx' || path.extname(filePath) === '.ts') {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// SPA catch-all: for any request not handled, send index.html.
// FIX: Add explicit `Request` and `Response` types to resolve handler signature errors.
app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(rootDir, 'index.html'));
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