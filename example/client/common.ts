// 前端和nodejs均可用
import { port } from '../port';
import { WebsocketClient } from '../../src';

export default new WebsocketClient(`ws://localhost:${port}`);
