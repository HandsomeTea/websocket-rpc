import { Socket } from '../src/websocket';
import instance from './base';

const { server, client } = instance(3305);

beforeAll(async () => {
    await new Promise(resolve => {
        server.receive(() => {
            client.on('open', () => resolve(0));
        });
    });
});

afterAll(() => {
    client.close();
    server.close();
});

describe('middleware', () => {

    it('通过method名称设置middleware', async () => {
        const result = await new Promise(resolve => {
            server.method('method1', (_params: unknown, socket: Socket) => {
                return {
                    result: 'success',
                    ...socket.attempt
                };
            });

            server.middleware('method1', () => {
                return {
                    status: 'method1-success'
                };
            });

            client.send(JSON.stringify({ method: 'method1', id: new Date().getTime(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(Number),
            result: { result: 'success', status: 'method1-success' }
        });
        expect(server.methodList).toStrictEqual(['method1'])
        expect(server.middlewareList.length).toEqual(1);
    });

    it('通过object设置middleware', async () => {
        const result = await new Promise(resolve => {
            server.method('method2', (_params: unknown, socket: Socket) => {
                return {
                    result: 'success',
                    ...socket.attempt
                };
            });

            server.middleware(() => {
                return {
                    status: 'method2-success'
                };
            });
            client.send(JSON.stringify({ method: 'method2', id: new Date().getTime(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(Number),
            result: { result: 'success', status: 'method2-success' }
        });
        expect(server.methodList).toStrictEqual(['method1', 'method2'])
        expect(server.middlewareList.length).toEqual(2);
    });
});
