import { GameState } from '../../../game/game';
import { ServerTime } from '../../../game/serverTime';
import { Debug } from '../debug';
import { Rating } from '../rating';
import style from './index.module.css';

export interface AppProps {
  state: GameState;
  serverTime: ServerTime;
}

export function App({ state, serverTime }: AppProps) {
  return (
    <div className={style.root}>
      <Debug serverTime={serverTime} />
      <Rating state={state} />
    </div>
  );
}
