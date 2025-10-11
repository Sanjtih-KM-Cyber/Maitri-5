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
// Use path.resolve for a more robust path to the project root directory.
const rootDir = path.resolve(__dirname, '..', '..');

// Serve static files from the project root.
app.use(express.static(rootDir, {
    setHeaders: (res: http.ServerResponse, filePath: string) => {
        // Ensure .ts and .tsx files are served with the correct JavaScript MIME type
        // for in-browser Babel transpilation.
        if (path.extname(filePath) === '.tsx' || path.extname(filePath) === '.ts') {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// SPA catch-all: for any request that doesn't match an API route or a static file,
// send the main index.html file. This is crucial for client-side routing.
app.get('*', (req: express.Request, res: express.Response) => {
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