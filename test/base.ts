/* istanbul ignore file */
import { WebsocketServer } from '../src/websocket';
import WS from 'ws';

export default (port: number) => {
    const server = new WebsocketServer({ port });
    const client = new WS(`ws://localhost:${port}`);

    return {
        server,
        client
    };
};
