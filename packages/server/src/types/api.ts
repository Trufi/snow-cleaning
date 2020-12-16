export interface KickAllRequest {
  secret: string;
}

export interface RestartRequest {
  name: string;
  duration: number;
  inSeconds: number;
  secret: string;
}
