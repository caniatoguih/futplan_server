import { Request, Response } from 'express';
import { prisma, pool } from '../database.ts';

export const createMatch = async (req: Request, res: Response) => {
  try {
    const { home_team_id, away_team_id, location_id, match_datetime } = req.body;
    const userId = (req as any).userId;

    // 1. Inserção usando o driver NATIVO (pula o bug do Prisma)
    await pool.query(
      `INSERT INTO matches (location_id, home_team_id, away_team_id, match_datetime, match_status, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [location_id, home_team_id, away_team_id, new Date(match_datetime), 'scheduled', userId]
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