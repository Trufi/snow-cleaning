import { mapToArray } from '@game/utils';
import { GameState } from './game/game';
import { ServerTime } from './game/serverTime';

const scoreboard = document.getElementById('scoreboard') as HTMLDivElement;

export function renderUI(state: GameState, serverTime: ServerTime) {
  const players = mapToArray(state.players);
  players.sort((a, b) => b.score - a.score);

  const html = `<div style="margin-bottom: 15px;">Rating:${players
    .map((player) => `<div class="row">${player.name} – ${Math.round(player.score)}</div>`)
    .join('')}</div>
  <div>Debug:
    <div>Ping: ${serverTime.getPing()}</div>
    <div>Diff: ${serverTime.getDiff()}</div>
    <div>Back: ${serverTime.getInterpolateTimeShift()}</div>
  </div>`;

  scoreboard.innerHTML = html;
}
