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

    // Split query into two simpler queries to avoid timeout
    const [ownedTeams, memberTeams] = await Promise.all([
      // Teams I own
      prisma.teams.findMany({
        where: { owner_id: userId },
        include: {
          _count: {
            select: { team_members: true }
          }
        }
      }),
      // Teams where I'm a member (but not the owner)
      prisma.teams.findMany({
        where: {
          team_members: {
            some: { user_id: userId }
          },
          owner_id: { not: userId } // Exclude teams I own to avoid duplicates
        },
        include: {
          _count: {
            select: { team_members: true }
          }
        }
      })
    ]);

    // Add role to each team
    const teamsWithRole = [
      ...ownedTeams.map(team => ({ ...team, role: 'owner' })),
      ...memberTeams.map(team => ({ ...team, role: 'member' }))
    ];

    res.json(teamsWithRole);
} catch (error) {
  console.error("ERRO NO BANCO:", error); // Adicione isso para ver o log no terminal
  res.status(500).json({ error: "Erro ao procurar os teus times." });
}
};

export const getTeamsByUserEmail = async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;

    if (!email) {
      return res.status(400).json({ error: "Informe o email para busca." });
    }

    const user = await prisma.users.findUnique({
      where: { user_email: email }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    // Listamos apenas os times que o usuário é DONO, pois apenas o dono pode aceitar convites de jogo
    const teams = await prisma.teams.findMany({
      where: { owner_id: user.user_id }
    });

    res.json(teams);
  } catch (error) {
    console.error("Erro ao buscar times por email:", error);
    res.status(500).json({ error: "Erro ao buscar times." });
  }
};

export const getTeam = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const team = await prisma.teams.findUnique({
      where: { team_id: id },
      include: {
        team_members: {
          include: {
            users: {
              select: {
                user_id: true,
                user_name: true,
                user_email: true
              }
            }
          }
        },
        _count: {
          select: { team_members: true }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ error: "Time não encontrado." });
    }

    res.json(team);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar detalhes do time." });
  }
};

export const addTeamMember = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { user_email } = req.body;

    const user = await prisma.users.findUnique({
      where: { user_email }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    // Check if already member
    const existingMember = await prisma.team_members.findUnique({
      where: {
        team_id_user_id: {
          team_id: id,
          user_id: user.user_id
        }
      }
    });

    if (existingMember) {
      return res.status(400).json({ error: "Usuário já é membro deste time." });
    }

    const member = await prisma.team_members.create({
      data: {
        team_id: id,
        user_id: user.user_id
      },
      include: {
        users: true
      }
    });

    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ error: "Erro ao adicionar membro." });
  }
};

export const removeTeamMember = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.params.userId as string;

    await prisma.team_members.delete({
      where: {
        team_id_user_id: {
          team_id: id,
          user_id: userId
        }
      }
    });

    res.json({ message: "Membro removido com sucesso." });
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover membro." });
  }
};

export const getTeamMatches = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const matches = await prisma.matches.findMany({
      where: {
        OR: [
          { home_team_id: id },
          { away_team_id: id }
        ]
      },
      include: {
        locations: true,
        teams_matches_home_team_idToteams: true,
        teams_matches_away_team_idToteams: true
      },
      orderBy: {
        match_datetime: 'desc'
      }
    });

    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar partidas do time." });
  }
};
