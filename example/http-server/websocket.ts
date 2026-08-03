import server from './server';
import { WebsocketServer } from '../../src';

type SocketData = {
    userId: string;
    role: string;
    token: string;
}

export default new WebsocketServer<SocketData>({ server });
