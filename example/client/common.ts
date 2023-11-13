// 前端和nodejs均可用
import Websocket from 'ws';
import { port } from '../port';

export default new Websocket(`ws://localhost:${port}`);
