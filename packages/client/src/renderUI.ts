import { mapToArray } from '@game/utils';
import { GameState } from './game/game';

const scoreboard = document.getElementById('scoreboard') as HTMLDivElement;

export function renderUI(state: GameState) {
  const players = mapToArray(state.players);
  players.sort((a, b) => b.score - a.score);

  const html = `<div>${players
    .map((player) => `<div class="row">${player.name} – ${Math.round(player.score)}</div>`)
    .join('')}</div>`;

  scoreboard.innerHTML = html;
}
