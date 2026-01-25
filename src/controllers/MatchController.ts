import { Request, Response } from 'express';
import { prisma, pool } from '../database.ts';

export const createMatch = async (req: Request, res: Response) => {
  try {
    const { home_team_id, away_team_id, location_id, match_datetime } = req.body;
    const userId = (req as any).userId;

    // Se houver um time visitante, o status inicial é 'pending_approval', senão 'scheduled'
    const initialStatus = away_team_id ? 'pending_approval' : 'scheduled';

    // 1. Inserção usando o driver NATIVO (pula o bug do Prisma)
    await pool.query(
      `INSERT INTO matches (location_id, home_team_id, away_team_id, match_datetime, match_status, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [location_id, home_team_id, away_team_id, new Date(match_datetime), initialStatus, userId]
    );

    // 2. Agora usamos o Prisma apenas para buscar e formatar o JSON de resposta (o SELECT ele faz sem erro)
    const match = await prisma.matches.findFirst({
      where: {
        home_team_id,
        away_team_id,
        match_datetime: new Date(match_datetime)
      },
      include: {
        locations: true,
        teams_matches_home_team_idToteams: { select: { team_name: true } },
        teams_matches_away_team_idToteams: { select: { team_name: true } }
      }
    });

    res.status(201).json(match);
  } catch (error: any) {
    console.error("ERRO NATIVO:", error);
    res.status(500).json({ error: "Erro ao agendar partida via driver nativo.", details: error.message });
  }
};

export const getAllMatches = async (req: Request, res: Response) => {
  try {
    const matches = await prisma.matches.findMany({
      include: {
        locations: true,
        teams_matches_home_team_idToteams: true,
        teams_matches_away_team_idToteams: true
      },
      orderBy: { match_datetime: 'asc' }
    });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar partidas." });
  }
};

export const getMatchDashboard = async (req: Request, res: Response) => {
  try {
    const match_id = req.params.match_id as string;

    const matchData = await prisma.matches.findUnique({
      where: { match_id },
      include: {
        locations: true,
        // Buscamos apenas os nomes dos times
        teams_matches_home_team_idToteams: {
          select: { 
            team_name: true,
            team_main_color_hex: true
          }
        },
        teams_matches_away_team_idToteams: {
          select: { 
            team_name: true,
            team_main_color_hex: true
          }
        },
        // Cronologia dos gols e cartões
        match_events: {
          orderBy: { match_minute: 'asc' },
          include: {
            users_match_events_player_idTousers: {
              select: { user_name: true }
            }
          }
        }
      }
    });

    if (!matchData) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    res.json(matchData);
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao carregar dashboard.", details: error.message });
  }
};

export const startMatch = async (req: Request, res: Response) => {
  try {
    const { match_id } = req.params;
    const userId = (req as any).userId;

    const match = await prisma.matches.findUnique({
      where: { match_id: match_id as string },
    });

    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    if (match.created_by !== userId) {
      return res.status(403).json({ error: "Apenas o criador da partida pode iniciá-la." });
    }

    if (new Date() < new Date(match.match_datetime)) {
        return res.status(400).json({ error: "A partida só pode ser iniciada após o horário agendado." });
    }
    
    if (match.match_status !== 'scheduled' && match.match_status !== 'pending_approval') {
        return res.status(400).json({ error: "A partida não pode ser iniciada. Status atual: " + match.match_status });
    }

    const updatedMatch = await prisma.matches.update({
      where: { match_id: match_id as string },
      data: { 
        match_status: 'in_progress',
        updated_at: new Date()
      }
    });

    res.json(updatedMatch);
  } catch (error: any) {
    res.status(400).json({ error: "Erro ao iniciar partida.", details: error.message });
  }
};

export const finishMatch = async (req: Request, res: Response) => {
  try {
    const { match_id } = req.params;

    const finishedMatch = await prisma.matches.update({
      where: { match_id: match_id as string },
      data: { 
        match_status: 'finished',
        updated_at: new Date()
      }
    });

    res.json({ 
      message: "Fim de jogo! Partida encerrada com sucesso.", 
      result: `${finishedMatch.home_team_score} x ${finishedMatch.away_team_score}` 
    });
  } catch (error: any) {
    res.status(400).json({ error: "Erro ao encerrar partida.", details: error.message });
  }
};

export const respondToMatchInvite = async (req: Request, res: Response) => {
  try {
    const match_id = req.params.match_id as string;
    const { action } = req.body; // 'accept' | 'reject'
    const userId = (req as any).userId;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: "Ação inválida. Use 'accept' ou 'reject'." });
    }

    const match = await prisma.matches.findUnique({
      where: { match_id },
      include: {
        teams_matches_away_team_idToteams: true
      }
    });

    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    if (match.match_status !== 'pending_approval') {
      return res.status(400).json({ error: "Esta partida não requer aprovação ou já foi processada." });
    }

    const awayTeam = match.teams_matches_away_team_idToteams;
    if (!awayTeam || awayTeam.owner_id !== userId) {
      return res.status(403).json({ error: "Apenas o dono do time visitante pode responder ao convite." });
    }

    const newStatus = action === 'accept' ? 'scheduled' : 'canceled';

    const updatedMatch = await prisma.matches.update({
      where: { match_id },
      data: { match_status: newStatus }
    });

    res.json({ message: `Convite ${action === 'accept' ? 'aceito' : 'rejeitado'} com sucesso!`, match_status: updatedMatch.match_status });
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao responder convite.", details: error.message });
  }
};