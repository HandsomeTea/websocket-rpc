import { WebsocketServer } from '../../src';
import { port } from '../port';

type SocketData = {
    userId: string;
    role: string;
    token: string;
}

export default new WebsocketServer<SocketData>({ port });
