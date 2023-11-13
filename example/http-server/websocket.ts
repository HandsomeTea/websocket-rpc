import server from './server';
import { WebsocketServer } from '../../src';

interface SocketData {
    userId: string;
    role: string;
    token: string;
}

export default new WebsocketServer<SocketData>({ server });
