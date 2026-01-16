import 'dotenv/config';
import express from 'express';
import { register, login } from './controllers/AuthController.ts';
import { createTeam, getMyTeams } from './controllers/TeamController.ts';
import { authMiddleware } from './middlewares/auth.ts';
import { createLocation, getAllLocations } from './controllers/LocationController.ts';
import { createMatch, getAllMatches } from './controllers/MatchController.ts';
import { getMatchRoster, updateRosterStatus, updatePlayerAssignment, distributePlayers, addPlayerToMatch, clearTeamAssignments, manualTeamAssignment, syncTeamPlayersToRoster } from './controllers/RosterController.ts';
import { createMatchEvent } from './controllers/EventController.ts';
import cors from 'cors';
import { checkRole } from './middlewares/role.ts';
import { getMatchDashboard, finishMatch } from './controllers/MatchController.ts';

const app = express();

// Configuração do CORS
app.use(cors({
  origin: 'http://localhost:8080', // Permite apenas o seu front-end
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rotas Públicas
app.post('/register', register);
app.post('/login', login);

// Rotas Protegidas (Exigem o Token no Header)
app.post('/teams', authMiddleware, createTeam);
app.get('/teams/my', authMiddleware, getMyTeams); // Nova rota para listar os meus times

app.get('/locations', authMiddleware, getAllLocations);
app.post('/locations', authMiddleware, createLocation);

app.post('/matches', authMiddleware, createMatch);
app.get('/matches', authMiddleware, getAllMatches);

app.post('/matches/:match_id/events', authMiddleware, createMatchEvent);

app.get('/matches/:match_id/roster', authMiddleware, getMatchRoster);
app.patch('/matches/:match_id/roster', authMiddleware, updateRosterStatus);
app.post('/matches/:match_id/roster', authMiddleware, addPlayerToMatch);
app.post('/matches/:match_id/roster/sync', authMiddleware, syncTeamPlayersToRoster); // Nova rota

// Apenas ADMIN ou MANAGER podem "sortear" os times
app.post('/matches/:match_id/distribute', authMiddleware, distributePlayers);
app.delete('/matches/:match_id/distribute', authMiddleware, clearTeamAssignments);
app.patch('/matches/:match_id/teams/assign', authMiddleware, checkRole(['ADMIN', 'MANAGER']), manualTeamAssignment);

app.patch('/matches/:match_id/roster/:user_id/assign', authMiddleware, updatePlayerAssignment);

app.get('/matches/:match_id/dashboard', authMiddleware, getMatchDashboard);
app.patch('/matches/:match_id/finish', authMiddleware, finishMatch);

app.listen(3000, () => console.log('🚀 FutPlan API rodando na porta 3000'));