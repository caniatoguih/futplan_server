import { Request, Response } from 'express';
import { prisma } from '../database.ts';

export const createMatchEvent = async (req: Request, res: Response) => {
    try {
        const match_id = req.params.match_id as string;
        const { event_type, user_id, assist_player_id, match_minute, description } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: "O campo user_id é obrigatório." });
        }

        // Apenas criamos o evento. A TRIGGER no Postgres cuida do placar.
        const event = await prisma.match_events.create({
            data: {
                match_id,
                player_id: user_id,
                assist_player_id: assist_player_id || null,
                event_type,
                match_minute: Number(match_minute),
                event_details: description
            }
        });

        res.status(201).json({
            message: "Evento registrado! O placar foi atualizado automaticamente pelo banco.",
            event
        });
    } catch (error: any) {
        console.error("Erro no Evento:", error.message);

        // Verifica se o erro veio da nossa Trigger (RAISE EXCEPTION)
        if (error.message.includes('partida já encerrada')) {
            return res.status(403).json({ error: "Jogo Fechado", details: "Este jogo já foi apitado! Não é possível alterar o histórico." });
        }

        res.status(500).json({ error: "Erro ao registrar evento.", details: error.message });
    }
};