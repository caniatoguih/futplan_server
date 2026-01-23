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

    const validStatuses = ['confirmed', 'pending', 'waiting_list', 'pending_decision'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: "Status inválido.", 
        details: `Valores permitidos: ${validStatuses.join(', ')}` 
      });
    }

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

export const addPlayerToMatch = async (req: Request, res: Response) => {
  try {
    const { match_id } = req.params;
    const { user_id, user_email } = req.body;

    if (!user_id && !user_email) {
      return res.status(400).json({ error: "Forneça user_id ou user_email." });
    }

    // Verificar se a partida existe e não tem times vinculados
    const match = await prisma.matches.findUnique({
      where: { match_id: match_id as string }
    });

    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    if (match.home_team_id || match.away_team_id) {
      return res.status(400).json({ error: "Esta partida já possui times vinculados. Use a funcionalidade de times para adicionar jogadores." });
    }

    // Buscar o usuário pelo email ou user_id
    let user;
    if (user_email) {
      user = await prisma.users.findUnique({
        where: { user_email: user_email as string }
      });
    } else {
      user = await prisma.users.findUnique({
        where: { user_id: user_id as string }
      });
    }

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    // Verificar se o jogador já está no roster
    const existingRoster = await prisma.match_roster.findUnique({
      where: {
        match_id_user_id: {
          match_id: match_id as string,
          user_id: user.user_id
        }
      }
    });

    if (existingRoster) {
      return res.status(400).json({ error: "Este jogador já foi adicionado à partida." });
    }

    // Adicionar o jogador ao roster
    const newRosterEntry = await prisma.match_roster.create({
      data: {
        match_id: match_id as string,
        user_id: user.user_id,
        status: 'pending'
      },
      include: {
        users: {
          select: {
            user_id: true,
            user_name: true,
            user_email: true
          }
        }
      }
    });

    res.status(201).json({ 
      message: `${newRosterEntry.users.user_name} foi adicionado à partida!`, 
      roster: newRosterEntry 
    });
  } catch (error: any) {
    console.error('Erro ao adicionar jogador:', error);
    res.status(500).json({ error: "Erro ao adicionar jogador à partida.", details: error.message });
  }
};

export const distributePlayers = async (req: Request, res: Response) => {
  try {
    const { match_id } = req.params;

    // Verificar se a partida existe e se tem times vinculados
    const match = await prisma.matches.findUnique({
      where: { match_id: match_id as string }
    });

    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    if (match.home_team_id || match.away_team_id) {
      return res.status(400).json({ error: "Não é possível realizar sorteio em partidas com times oficiais definidos." });
    }

    // 1. Buscar todos os jogadores que estão no roster dessa partida
    const players = await prisma.match_roster.findMany({
      where: { match_id: match_id as string }
    });

    if (players.length === 0) {
      return res.status(400).json({ error: "Não há jogadores no roster para distribuir." });
    }

    // 2. Embaralhar os jogadores (Algoritmo Fisher-Yates simples)
    const shuffled = players.sort(() => Math.random() - 0.5);

    // 3. Dividir ao meio
    const half = Math.ceil(shuffled.length / 2);
    
    // 4. Preparar as atualizações
    const updates = shuffled.map((player: typeof players[number], index: number) => {
      const assignment = index < half ? 'home' : 'away';
      return prisma.match_roster.update({
        where: {
          match_id_user_id: {
            match_id: player.match_id,
            user_id: player.user_id
          }
        },
        data: { team_assignment: assignment }
      });
    });

    // Executa todas as atualizações em uma transação
    await prisma.$transaction(updates);

    res.json({ message: "Times distribuídos aleatoriamente!", total_players: players.length });
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao distribuir jogadores.", details: error.message });
  }
};

export const clearTeamAssignments = async (req: Request, res: Response) => {
  try {
    const { match_id } = req.params;

    // Verificar se a partida existe
    const match = await prisma.matches.findUnique({
      where: { match_id: match_id as string }
    });

    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    // Limpar as atribuições de time de todos os jogadores
    const result = await prisma.match_roster.updateMany({
      where: { match_id: match_id as string },
      data: { team_assignment: null }
    });

    res.json({ 
      message: "Distribuição de times desfeita com sucesso!", 
      playersUpdated: result.count 
    });
  } catch (error: any) {
    console.error('Erro ao desfazer distribuição:', error);
    res.status(500).json({ error: "Erro ao desfazer distribuição.", details: error.message });
  }
};

export const manualTeamAssignment = async (req: Request, res: Response) => {
  try {
    const { match_id } = req.params;
    const { assignments } = req.body; // Array de { user_id, team_assignment }

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: "Forneça um array de atribuições com user_id e team_assignment." });
    }

    // Verificar se a partida existe
    const match = await prisma.matches.findUnique({
      where: { match_id: match_id as string }
    });

    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    // Validar todas as atribuições antes de processar
    for (const assignment of assignments) {
      if (!assignment.user_id || !assignment.team_assignment) {
        return res.status(400).json({ error: "Cada atribuição deve conter user_id e team_assignment." });
      }

      if (!['home', 'away'].includes(assignment.team_assignment)) {
        return res.status(400).json({ error: "team_assignment deve ser 'home' ou 'away'." });
      }
    }

    // Preparar as atualizações
    const updates = assignments.map((assignment: { user_id: string; team_assignment: string }) => {
      return prisma.match_roster.update({
        where: {
          match_id_user_id: {
            match_id: match_id as string,
            user_id: assignment.user_id
          }
        },
        data: { team_assignment: assignment.team_assignment }
      });
    });

    // Executar todas as atualizações em uma transação
    await prisma.$transaction(updates);

    res.json({ 
      message: "Times atribuídos manualmente com sucesso!", 
      playersUpdated: assignments.length 
    });
  } catch (error: any) {
    console.error('Erro ao atribuir times manualmente:', error);
    res.status(500).json({ error: "Erro ao atribuir times manualmente.", details: error.message });
  }
};

export const syncTeamPlayersToRoster = async (req: Request, res: Response) => {
  try {
    const { match_id } = req.params;

    // Buscar a partida e os membros dos times vinculados
    const match = await prisma.matches.findUnique({
      where: { match_id: match_id as string },
      include: {
        teams_matches_home_team_idToteams: {
          include: { team_members: true }
        },
        teams_matches_away_team_idToteams: {
          include: { team_members: true }
        }
      }
    });

    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    const homeMembers = match.teams_matches_home_team_idToteams?.team_members || [];
    const awayMembers = match.teams_matches_away_team_idToteams?.team_members || [];

    if (homeMembers.length === 0 && awayMembers.length === 0) {
      return res.status(400).json({ error: "Não há jogadores nos times vinculados para importar." });
    }

    const operations: any[] = [];

    // Função auxiliar para gerar a operação de upsert
    const createUpsertOp = (userId: string, assignment: 'home' | 'away') => {
      return prisma.match_roster.upsert({
        where: {
          match_id_user_id: {
            match_id: match_id as string,
            user_id: userId
          }
        },
        create: {
          match_id: match_id as string,
          user_id: userId,
          team_assignment: assignment,
          status: 'confirmed'
        },
        update: {
          team_assignment: assignment
        }
      });
    };

    // Adiciona operações para Home e Away
    homeMembers.forEach(m => operations.push(createUpsertOp(m.user_id, 'home')));
    awayMembers.forEach(m => operations.push(createUpsertOp(m.user_id, 'away')));

    await prisma.$transaction(operations);

    res.json({ 
      message: "Jogadores importados e sincronizados com sucesso!", 
      total_processed: operations.length 
    });
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao sincronizar jogadores dos times.", details: error.message });
  }
};