import WS from 'ws';
import { WebsocketServer } from '../src';

describe('事件', () => {

    it('online', async () => {
        const result = await new Promise(resolve => {
            const port = 3202;
            const server = new WebsocketServer({ port });

            server.start();
            server.online(socket => {
                socket.sendout({
                    id: new Date().getTime(),
                    method: 'test-notice',
                    result: 'success'
                });
            });
            const client = new WS(`ws://localhost:${port}`);

            client.once('message', data => {
                server.close();
                resolve(JSON.parse(data.toString()));
            });
            client.once('open', () => {
                client.close();
            });
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(Number),
            method: 'test-notice',
            result: 'success'
        });
    });

    it('offline', async () => {
        let sessionId = '';
        const result = await new Promise(resolve => {
            const port = 3203;
            const server = new WebsocketServer({ port });

            server.start();
            server.online(socket => {
                sessionId = socket.connection.id;
            });
            server.offline((_attribute, connection) => {
                server.close();
                resolve(connection.id);
            });
            const client = new WS(`ws://localhost:${port}`);

            client.on('open', () => {
                client.close();
            });
        });

        expect(result).toEqual(sessionId);
    });

    it('method error', async () => {
        const result = await new Promise(resolve => {
            const port = 3204;
            const server = new WebsocketServer({ port });

            server.start();
            server.error((error, socket) => {
                socket.send(error.message);
                server.close();
            });
            server.register('m1', () => {
                throw new Error('method-error');
            });
            const client = new WS(`ws://localhost:${port}`);

            client.on('open', () => {
                client.send(JSON.stringify({ method: 'm1', id: new Date().getTime(), params: [], jsonrpc: '2.0' }));
                client.once('message', data => {
                    client.close();
                    resolve(data.toString());
                });
            });
        });

        expect(result).toEqual('method-error');
    });

    it('某个method的中间件error', async () => {
        const result = await new Promise(resolve => {
            const port = 3205;
            const server = new WebsocketServer({ port });

            server.start();
            server.error((error, socket) => {
                socket.send(error.message);
                server.close();
            });
            server.use('m1', () => {
                throw new Error('m1-middleware-error');
            });
            server.register('m1', () => { });
            const client = new WS(`ws://localhost:${port}`);

            client.on('open', () => {
                client.send(JSON.stringify({ method: 'm1', id: new Date().getTime(), params: [], jsonrpc: '2.0' }));
                client.once('message', data => {
                    client.close();
                    resolve(data.toString());
                });
            });
        });

        expect(result).toEqual('m1-middleware-error');
    });

    it('对所有method起作用的中间件error', async () => {
        const result = await new Promise(resolve => {
            const port = 3206;
            const server = new WebsocketServer({ port });

            server.start();
            server.error((error, socket) => {
                socket.send(error.message);
                server.close();
            });
            server.use(() => {
                throw new Error('middleware-error');
            });
            server.register('m2', () => { });
            const client = new WS(`ws://localhost:${port}`);

            client.on('open', () => {
                client.send(JSON.stringify({ method: 'm2', id: new Date().getTime(), params: [], jsonrpc: '2.0' }));
                client.once('message', data => {
                    client.close();
                    resolve(data.toString());
                });
            });
        });

        expect(result).toEqual('middleware-error');
    });
});
