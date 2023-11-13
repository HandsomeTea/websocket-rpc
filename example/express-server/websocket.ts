import { WebsocketServer } from '../../src';
import server from './server';

interface SocketData {
    userId: string;
    role: string;
    token: string;
}
const websocket = new WebsocketServer<SocketData>({ server });

export default websocket;
