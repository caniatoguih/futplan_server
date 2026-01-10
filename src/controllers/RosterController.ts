import { Request, Response } from 'express';
import { prisma } from '../database.ts';

export const getMatchRoster = async (req: Request, res: Response) => {
  try {
    // Forçamos o tipo para string para o Prisma não reclamar
    const match_id = req.params.match_id as string;

    const roster = await prisma.match_roster.findMany({
      where: { 
        match_id: match_id 
      },
      include: {
        users: {
          select: {
            user_name: true,
            user_email: true
          }
        }
      },
      orderBy: [
        { team_assignment: 'asc' },
        { users: { user_name: 'asc' } }
      ]
    });

    res.json(roster);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar a lista de jogadores." });
  }
};

export const updateRosterStatus = async (req: Request, res: Response) => {
  try {
    const match_id = req.params.match_id as string;
    const { status } = req.body;
    const userId = (req as any).userId;

    const updated = await prisma.match_roster.update({
      where: {
        // Certifique-se que o nome do campo é este no seu schema.prisma
        match_id_user_id: {
          match_id: match_id,
          user_id: userId
        }
      },
      data: { status }
    });

    res.json({ message: "Presença atualizada!", updated });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: "Erro ao atualizar presença.", details: error.message });
  }
};

export const updatePlayerAssignment = async (req: Request, res: Response) => {
  try {
    const { match_id, user_id } = req.params;
    const { team_assignment } = req.body;

    if (!['home', 'away'].includes(team_assignment)) {
      return res.status(400).json({ error: "O time deve ser 'home' ou 'away'." });
    }

    const updatedRoster = await prisma.match_roster.update({
      where: {
        match_id_user_id: {
          match_id: match_id as string,
          user_id: user_id as string
        }
      },
      data: { 
        team_assignment,
        status: 'confirmed' 
      }
    });

    res.json({ 
      message: `Jogador definido como ${team_assignment} com sucesso!`, 
      updatedRoster 
    });
  } catch (error: any) {
    res.status(400).json({ error: "Erro ao definir time do jogador.", details: error.message });
  }
};