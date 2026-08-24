// 前端和nodejs均可用
import { port } from '../port';
import { WebSocketClient } from '../../src';

export default new WebSocketClient(`ws://localhost:${port}`);
