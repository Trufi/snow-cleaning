import { mapToArray } from '@game/utils';
import { GameState } from '../../../game/game';
import style from './index.module.css';

export interface RatingProps {
  state: GameState;
}

const rowsCount = 5;

export function Rating({ state }: RatingProps) {
  const players = mapToArray(state.players);
  players.sort((a, b) => b.score - a.score);

  const currentPlayerIndex = players.findIndex((player) => player === state.currentPlayer);
  const minIndex = Math.max(0, currentPlayerIndex - Math.floor(rowsCount / 2));
  const maxIndex = minIndex + rowsCount;

  const shownPlayers = players.slice(minIndex, maxIndex);

  return (
    <div className={style.root}>
      {shownPlayers.map((player, index) => (
        <div key={player.id} className={style.row}>
          {minIndex + index + 1}. {player.name} – {Math.round(player.score)}
        </div>
      ))}
    </div>
  );
}
