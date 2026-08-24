import { WebSocketServer } from '../../src';
import server from './server';

type SocketData = {
    userId: string;
    role: string;
    token: string;
}
const websocket = new WebSocketServer<SocketData>({ server });

export default websocket;
