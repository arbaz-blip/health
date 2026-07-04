import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    const { role } = req.user;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ 
        status: 'error', 
        message: `Access denied. Role '${role}' is not authorized to access this resource.` 
      });
    }

    next();
  };
};
