import { Routes } from '@angular/router';
import { LobbyComponent } from './features/lobby/lobby.component';
import { GameBoardComponent } from './features/game-board/game-board.component';

export const routes: Routes = [
  { path: '', component: LobbyComponent },
  { path: 'game', component: GameBoardComponent },
  { path: '**', redirectTo: '' },
];
