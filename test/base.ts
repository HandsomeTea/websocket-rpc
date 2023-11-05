/* istanbul ignore file */
import { WebsocketServer } from '../src/websocket';
import WS from 'ws';

export default (port: number, log?: true) => {
    const server = new WebsocketServer({ port }, { log });
    const client = new WS(`ws://localhost:${port}`);

    return {
        server,
        client
    }
}
