import { GameState } from '../../../game/game';
import { ServerTime } from '../../../game/serverTime';
import { BigScore } from '../bigScore';
import { Debug } from '../debug';
import { Rating } from '../rating';
import { StartScreen } from '../startScreen';
import style from './index.module.css';

export interface InitialAppProps {
  type: 'initial';
}

export interface ConnectedAppProps {
  type: 'connected';
  onNameSubmit: (name: string) => void;
}

export interface InGameAppProps {
  type: 'inGame';
  state: GameState;
  serverTime: ServerTime;
}

export type AppProps = InitialAppProps | ConnectedAppProps | InGameAppProps;

export function App(props: AppProps) {
  switch (props.type) {
    case 'initial': {
      return <div className={style.root}>Connecting to server...</div>;
    }

    case 'connected': {
      return (
        <div className={style.root}>
          <StartScreen onNameSubmit={props.onNameSubmit} />
        </div>
      );
    }

    case 'inGame': {
      const { state, serverTime } = props;

      return (
        <div className={style.root}>
          <Debug serverTime={serverTime} state={state} />
          <Rating state={state} />
          <BigScore state={state} />
        </div>
      );
    }

    default: {
      return <div></div>;
    }
  }
}
