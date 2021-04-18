import { ServerTime } from '../../../game/serverTime';
import style from './index.module.css';

export interface DebugProps {
  serverTime: ServerTime;
}

export function Debug({ serverTime }: DebugProps) {
  return (
    <div className={style.root}>
      <div>Ping: {serverTime.getPing()}</div>
      <div>Diff: {serverTime.getDiff()}</div>
      <div>Back: {Math.round(serverTime.getInterpolateTimeShift())}</div>
    </div>
  );
}
