
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserType } from '../../../types';

// Fix: The alias 'ExpressRequest' was causing type inheritance issues. 
// Changed to extend the base `Request` type directly to ensure all properties are available on AuthRequest.
export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    type: UserType;
  };
}

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.header('Authorization');

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

export const adminAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.type === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
};
