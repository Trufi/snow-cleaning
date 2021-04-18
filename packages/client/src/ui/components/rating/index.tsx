import { mapToArray } from '@game/utils';
import { GameState } from '../../../game/game';
import style from './index.module.css';

export interface RatingProps {
  state: GameState;
}

export function Rating({ state }: RatingProps) {
  const players = mapToArray(state.players);
  players.sort((a, b) => b.score - a.score);

  return (
    <div className={style.root}>
      {players.map((player) => (
        <div key={player.id} className={style.row}>
          {player.name} – {Math.round(player.score)}
        </div>
      ))}
    </div>
  );
}
