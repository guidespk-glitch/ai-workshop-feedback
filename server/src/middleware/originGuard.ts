import type { Request, Response, NextFunction } from 'express';

export function originGuard(allowedOrigin: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (!origin || origin !== allowedOrigin) {
      res.status(403).json({ error: 'Forbidden: Invalid or missing Origin header' });
      return;
    }
    next();
  };
}
