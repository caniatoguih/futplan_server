import 'dotenv/config';
import express from 'express';
import { register, login } from './controllers/AuthController.ts';
import { createTeam, getMyTeams } from './controllers/TeamController.ts';
import { authMiddleware } from './middlewares/auth.ts';
import { createLocation, getAllLocations } from './controllers/LocationController.ts';
import { createMatch, getAllMatches } from './controllers/MatchController.ts';
import { getMatchRoster, updateRosterStatus, updatePlayerAssignment } from './controllers/RosterController.ts';
import { createMatchEvent } from './controllers/EventController.ts';

import { getMatchDashboard, finishMatch } from './controllers/MatchController.ts';

const app = express();
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

app.patch('/matches/:match_id/roster/:user_id/assign', authMiddleware, updatePlayerAssignment);

app.get('/matches/:match_id/dashboard', authMiddleware, getMatchDashboard);
app.patch('/matches/:match_id/finish', authMiddleware, finishMatch);

app.listen(3000, () => console.log('🚀 FutPlan API rodando na porta 3000'));