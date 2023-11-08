/* istanbul ignore file */
import { WebsocketServer } from '../src';
import WS from 'ws';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default <Attr extends Record<string, any>>(port: number) => {
    const server = new WebsocketServer<Attr>({ port });
    const client = new WS(`ws://localhost:${port}`);

    return {
        server,
        client
    };
};
