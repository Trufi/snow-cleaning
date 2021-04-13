import { ServerMsg } from '@game/server/messages';
import { config } from '@game/server/config';
import { clamp, lerp } from '@game/utils';
import { cmd, Cmd } from '../commands';
import { msg } from '../messages';

interface SmoothPing {
  value: number;
  time: number;
  from: { time: number; value: number };
  to: { time: number; value: number };
}

export class ServerTime {
  private diffSample: number[] = [];
  private diff = 0;

  private pingSample: number[] = [];
  private ping = 300;

  private smoothPing: SmoothPing = {
    value: 300,
    time: 0,
    from: { time: 0, value: 300 },
    to: { time: 0, value: 300 },
  };

  private lastPingTime: number = 0;

  constructor(time: number) {
    this.smoothPing.time = this.smoothPing.from.time = this.smoothPing.to.time = time;
  }

  /**
   * @param now Тут должно приходить время клиента! Не сервера!
   */
  public updatePingAndServerTime(now: number, msg: ServerMsg['pong']) {
    const maxSampleLength = 20;

    const ping = now - msg.clientTime;

    this.pingSample.push(ping);
    if (this.pingSample.length > maxSampleLength) {
      this.pingSample.shift();
    }

    this.ping = median(this.pingSample);

    this.setSmoothInterp(now + config.smoothPingTime, p90(this.pingSample));

    const diff = msg.clientTime + ping / 2 - msg.serverTime;
    this.diffSample.push(diff);
    if (this.diffSample.length > maxSampleLength) {
      this.diffSample.shift();
    }

    this.diff = median(this.diffSample);
  }

  /**
   * @param time Тут должно приходить время клиента! Не сервера!
   */
  public update(time: number): Cmd {
    const { smoothPing } = this;
    const t = clamp((time - smoothPing.from.time) / (smoothPing.to.time - smoothPing.from.time), 0, 1);

    smoothPing.value = lerp(smoothPing.from.value, smoothPing.to.value, t);
    smoothPing.time = time;

    if (time - this.lastPingTime > config.clientPingInterval) {
      this.lastPingTime = time;
      return cmd.sendMsg(msg.ping(time));
    }
  }

  /**
   * Для интрерполяции нужно:
   * 1. Взять время сервера
   * 2. Вычесть максимальное время, за которое данные могут идти до клиента
   *
   * Нужно, чтобы всегда перед началом нового интервала интерполяции были готовы данные
   */
  public getInterpolateTimeShift() {
    return this.smoothPing.value * 2 + config.clientSendChangesInterval + config.serverGameStep + 100;
  }

  public getPing() {
    return this.ping;
  }

  public getDiff() {
    return this.diff;
  }

  /**
   * Устанавливает плавный переход между предыдущим пингом и текущим
   * Этот пинг используется для вычисления времение интерполяции,
   * поэтому должен изменяться плавно. Иначе тела будут прыгать взыд-вперед при скачках пинга.
   *
   * @param toTime Тут должно приходить время клиента! Не сервера!
   */
  private setSmoothInterp(toTime: number, toValue: number) {
    this.smoothPing.from.value = this.smoothPing.value;
    this.smoothPing.from.time = this.smoothPing.time;

    this.smoothPing.to.value = toValue;
    this.smoothPing.to.time = toTime;
  }
}

/**
 * Находит медиана в несортированном массиве
 */
function median(sample: number[]) {
  const array = sample.slice();
  array.sort((a: number, b: number) => a - b);

  // Не совсем медиана, ну и пофиг
  const medianIndex = Math.floor(array.length / 2);

  return array[medianIndex];
}

function p90(sample: number[]) {
  const array = sample.slice();
  array.sort((a: number, b: number) => a - b);

  const index = Math.floor(array.length * 0.9);

  return array[index];
}
