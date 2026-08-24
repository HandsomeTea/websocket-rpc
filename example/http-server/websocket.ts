import server from './server';
import { WebSocketServer } from '../../src';

type SocketData = {
    userId: string;
    role: string;
    token: string;
}

export default new WebSocketServer<SocketData>({ server });
