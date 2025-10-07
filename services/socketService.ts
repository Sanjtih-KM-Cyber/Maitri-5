// services/socketService.ts
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

class SocketService {
    private socket: Socket | null = null;

    connect(): void {
        if (!this.socket) {
            this.socket = io(SOCKET_URL);

            this.socket.on('connect', () => {
                console.log('Socket.IO connected successfully.');
            });

            this.socket.on('disconnect', () => {
                console.log('Socket.IO disconnected.');
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket.IO connection error:', error);
            });
        }
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    on<T>(event: string, listener: (data: T) => void): void {
        this.socket?.on(event, listener);
    }

    off(event: string, listener?: (...args: any[]) => void): void {
        this.socket?.off(event, listener);
    }
}

export const socketService = new SocketService();
