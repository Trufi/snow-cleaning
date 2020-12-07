import axios from 'axios';
import * as config from '../../config';
import { NotifyRequest, PlayerRequest, PlayerResponse, AddPlayerStatsRequest } from '../../mainServer/types/gameApi';

const baseURL = `${config.mainServer.url}/game`;

export const notify = (data: NotifyRequest) => {
  return axios.post<void>(`${baseURL}/notify`, data).then((data) => data.data);
};

export const player = (data: PlayerRequest) => {
  return axios.post<PlayerResponse>(`${baseURL}/player`, data).then((data) => data.data);
};

export const addPlayerStats = (playerId: number, data: AddPlayerStatsRequest) => {
  return axios.post<void>(`${baseURL}/player/${playerId}/stats`, data).then((data) => data.data);
};
