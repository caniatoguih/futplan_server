import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database.ts';

export const checkRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId; // Pego pelo authMiddleware anterior

      const user = await prisma.users.findUnique({
        where: { user_id: userId },
        select: { role: true }
      });

      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ 
          error: "Acesso negado. Você não tem permissão para realizar esta ação." 
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: "Erro ao validar permissões." });
    }
  };
};