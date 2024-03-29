import { config } from '@game/server/config';
import { GameState } from '../../../game/game';
import style from './index.module.css';

export interface RatingProps {
  state: GameState;
}

const rowsCount = 5;

export function Rating({ state }: RatingProps) {
  const players = Array.from(state.players.values());
  players.sort((a, b) => b.score - a.score);

  const currentPlayerIndex = players.findIndex((player) => player === state.currentPlayer);
  const minIndex = Math.max(0, currentPlayerIndex - Math.floor(rowsCount / 2));
  const maxIndex = minIndex + rowsCount;

  const shownPlayers = players.slice(minIndex, maxIndex);

  return (
    <div className={style.root}>
      {shownPlayers.map((player, index) => (
        <div key={player.id} className={style.row}>
          <span className={style.number} style={{ border: `2px solid ${config.colors[player.harvester.color]}` }}>
            {minIndex + index + 1}
          </span>{' '}
          {player.name} – {Math.round(player.score)}
        </div>
      ))}
    </div>
  );
}
