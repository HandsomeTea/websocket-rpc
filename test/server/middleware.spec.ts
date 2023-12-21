import { uuid } from '../../src/lib';
import instance from './base';

const { server, client } = instance(3304);

beforeAll(async () => {
    await new Promise(resolve => {
        server.start();
        server.register('method1', (_params: unknown, socket) => {
            return {
                result: 'success',
                ...socket.attribute
            };
        });
        client.on('open', () => resolve(0));
    });
});

afterAll(() => {
    client.close();
    server.close();
});

describe('服务器-middleware', () => {

    it('通过method名称设置middleware', async () => {
        server.use('method1', () => {
            return {
                status: 'method1-success'
            };
        });
        const result = await new Promise(resolve => {
            client.send(JSON.stringify({ method: 'method1', id: uuid(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(String),
            method: 'method1',
            result: { result: 'success', status: 'method1-success' }
        });
        expect(server.methodList).toStrictEqual(['method1']);
    });

    it('通过object设置middleware', async () => {
        server.use(() => {
            return {
                status: 'method1-success-global-middleware'
            };
        });
        const result = await new Promise(resolve => {
            client.send(JSON.stringify({ method: 'method1', id: uuid(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(String),
            method: 'method1',
            result: { result: 'success', status: 'method1-success-global-middleware' }
        });
        expect(server.methodList).toStrictEqual(['method1']);
    });

    it('middleware抛出错误', async () => {
        server.use(() => {
            throw ['test', 'error'];
        });
        const result = await new Promise(resolve => {
            client.send(JSON.stringify({ method: 'method1', id: uuid(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(String),
            method: 'method1',
            error: {
                code: -32001,
                message: 'Method Request failed',
                data: ['test', 'error']
            }
        });
        expect(server.methodList).toStrictEqual(['method1']);
    });
});
