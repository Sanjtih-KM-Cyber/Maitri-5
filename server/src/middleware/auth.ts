import jwt from 'jsonwebtoken';
import express from 'express';
import type { UserType } from '../../../types';

export interface AuthRequest extends express.Request {
  user?: {
    id: string;
    name: string;
    type: UserType;
  };
};

export const auth = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token format is invalid, authorization denied' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET is not defined');
    
    const decoded = jwt.verify(token, jwtSecret) as { user: { id: string; name: string; type: UserType }};
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export const adminAuth = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (req.user && req.user.type === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
};