import { Request, Response } from 'express';
import { prisma } from '../database.ts';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const register = async (req: Request, res: Response) => {
  try {
    const { user_name, user_email, password } = req.body;

    // Criptografa a senha com custo 10
    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.users.create({
      data: {
        user_name,
        user_email,
        password_hash,
      },
      select: { user_id: true, user_name: true, user_email: true }
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: "E-mail já cadastrado ou erro nos dados." });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { user_email, password } = req.body;

    const user = await prisma.users.findUnique({ where: { user_email } });
    
    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    // Compara a senha enviada com o hash do banco
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    // Gera o token com validade de 7 dias
    const token = jwt.sign({ userId: user.user_id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: { id: user.user_id, name: user.user_name },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: "Erro interno.", details: error instanceof Error ? error.message : String(error) });
  }
};