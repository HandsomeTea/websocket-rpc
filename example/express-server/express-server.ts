import server from './server';
import websocket from './websocket';
import { port } from '../port';

server.listen(port, () => websocket.start());
