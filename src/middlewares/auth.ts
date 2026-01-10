import { Request, Response, NextFunction } from 'express';
import 'dotenv/config';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Token não enviado." });

  // O formato esperado é "Bearer TOKEN"
  const parts = authHeader.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: "Erro no formato do token." });

  const [scheme, token] = parts;

    try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    // Injeta na raiz da requisição
    (req as any).userId = decoded.userId; 
    
    return next();
    } catch (err) {
    const error = err as Error; // Força o tipo Error
    console.error("Erro na verificação do JWT:", error.message);
    return res.status(401).json({ error: "Token inválido ou expirado." });
    }
};