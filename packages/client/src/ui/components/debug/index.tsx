import { GameState } from '../../..//game/game';
import { ServerTime } from '../../../game/serverTime';
import style from './index.module.css';

export interface DebugProps {
  serverTime: ServerTime;
  state: GameState;
}

export function Debug({ serverTime, state }: DebugProps) {
  return (
    <div className={style.root}>
      <div>Encounter</div>
      <div style={{ paddingLeft: '5px' }}>
        <div>Type: {state.encounter.type}</div>
        <div>Ready: {Math.round(state.encounter.readyPercent * 100)}</div>
        <div>Time left: {Math.round((state.encounter.duration - (state.time - state.encounter.startTime)) / 1000)}</div>
      </div>
      <div>Ping: {serverTime.getPing()}</div>
      <div>Time diff: {serverTime.getDiff()}</div>
      <div>Back time: {Math.round(serverTime.getInterpolateTimeShift())}</div>
    </div>
  );
}
