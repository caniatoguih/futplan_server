import { Request, Response } from 'express';
import { prisma } from '../database.ts';

export const createTeam = async (req: Request, res: Response) => {
  try {
    const { team_name, team_main_color_hex } = req.body;
    const owner_id = (req as any).userId; // Vem do Token!

    // Criar o time e já vincular o criador como membro
    const team = await prisma.teams.create({
      data: {
        team_name,
        team_main_color_hex,
        owner_id,
        // Usamos uma transação implícita do Prisma para adicionar o membro
        team_members: {
          create: {
            user_id: owner_id,
            jersey_number: 10 // O dono ganha a 10 por padrão
          }
        }
      }
    });

    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar time." });
  }
};

export const getMyTeams = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId; // Obtido do Token pelo middleware

    const teams = await prisma.teams.findMany({
      where: {
        OR: [
          { owner_id: userId }, // Times que eu criei
          { team_members: { some: { user_id: userId } } } // Times onde sou membro
        ]
      },
      include: {
        _count: {
          select: { team_members: true } // Retorna a quantidade de jogadores no time
        }
      }
    });

    res.json(teams);
} catch (error) {
  console.error("ERRO NO BANCO:", error); // Adicione isso para ver o log no terminal
  res.status(500).json({ error: "Erro ao procurar os teus times." });
}
};