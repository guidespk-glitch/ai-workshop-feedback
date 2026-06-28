import type { Request, Response, NextFunction } from 'express';

export function originGuard(allowedOrigin: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Bypass origin checks for safe HTTP methods (GET, HEAD) as browsers do not send Origin header
    if (req.method === 'GET' || req.method === 'HEAD') {
      next();
      return;
    }

    const origin = req.headers.origin;
    if (!origin || origin !== allowedOrigin) {
      res.status(403).json({ error: 'Forbidden: Invalid or missing Origin header' });
      return;
    }
    next();
  };
}
