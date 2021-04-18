import { useEffect, useState } from 'react';
import cn from 'classnames';
import { GameState } from '../../../game/game';
import style from './index.module.css';

const sampleSize = 10;

export interface BigScoreProps {
  state: GameState;
}

export function BigScore({ state }: BigScoreProps) {
  const [speed, setSpeed] = useState(0);

  let interval: NodeJS.Timeout;
  useEffect(() => {
    let prevScore = state.currentPlayer.score;
    let sample: number[] = [];

    interval = setInterval(() => {
      const speed = Math.max(0, ((state.currentPlayer.score - prevScore) / 100) * 1000);
      prevScore = state.currentPlayer.score;

      sample.push(speed);
      sample = sample.slice(-sampleSize);
      const sum = sample.reduce((prev, current) => prev + current, 0);
      const mean = sum / sampleSize;
      setSpeed(mean);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(style.root, style.low, {
        [style.medium]: speed > 30,
        [style.high]: speed > 50,
      })}
    >
      <div className={style.score}>
        {Math.round(state.currentPlayer.score)}
        <div className={style.speed}>+{Math.round(speed)}</div>
      </div>
    </div>
  );
}
