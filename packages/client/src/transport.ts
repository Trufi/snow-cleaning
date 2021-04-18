import { AnyClientMsg } from './messages';
import { unpackMessage } from './messages/unpack';

export interface TransportProps {
  onOpen: () => void;
  onClose: () => void;
  onMessage: (msg: any) => void;
}

export class Transport {
  private ws: WebSocket;

  constructor(url: string, private props: TransportProps) {
    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.addEventListener('open', props.onOpen);
    this.ws.addEventListener('close', props.onClose);
    this.ws.addEventListener('message', this.onMessage);
  }

  public sendMessage(msg: AnyClientMsg) {
    this.ws.send(JSON.stringify(msg));
  }

  public sendPbfMessage(msg: ArrayBuffer) {
    this.ws.send(msg);
  }

  private onMessage = (ev: any) => {
    const msg = unpackMessage(ev.data);
    if (!msg) {
      return;
    }

    this.props.onMessage(msg);
  };
}
