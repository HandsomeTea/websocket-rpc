/* istanbul ignore file */
import { WebsocketServer, WebsocketClient } from '../../src';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default <Attr extends Record<string, any>>(port: number) => {
    const server = new WebsocketServer<Attr>({ port });
    const client = new WebsocketClient(`ws://localhost:${port}`);

    return {
        server,
        client
    };
};
