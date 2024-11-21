import { uuid } from '../../src/lib';
import instance from './base';

const { server, client } = instance(3323);

beforeAll(async () => {
    await new Promise(resolve => {
        server.start();
        client.on('open', () => resolve(0));
    });
});

afterAll(() => {
    client.close();
    server.close();
});

describe('服务器-method', () => {

    it('method不存在', async () => {
        const result = await new Promise(resolve => {
            client.send(JSON.stringify({ method: 'method1', id: uuid(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(String),
            method: 'method1',
            error: {
                code: -32601,
                message: 'Method not found',
                data: expect.any(String)
            }
        });
    });

    it('通过method名称设置method', async () => {
        server.register('method2', () => {
            return {
                method: 'method2'
            };
        });
        const result = await new Promise(resolve => {
            client.send(JSON.stringify({ method: 'method2', id: uuid(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(String),
            method: 'method2',
            result: { method: 'method2' }
        });
        expect(server.methodList).toStrictEqual(['method2']);
    });

    it('通过object设置method', async () => {
        server.register({
            method3() {
                return {
                    method: 'method3'
                };
            }
        });
        const result = await new Promise(resolve => {
            client.send(JSON.stringify({ method: 'method3', id: uuid(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(String),
            method: 'method3',
            result: { method: 'method3' }
        });
        expect(server.methodList).toStrictEqual(['method2', 'method3']);
    });

    it('通过object设置多个method', async () => {
        server.register({
            method4() {
                return {
                    method: 'method4'
                };
            },
            method5() {
                return {
                    method: 'method5'
                };
            }
        });
        const result1 = await new Promise(resolve => {
            client.send(JSON.stringify({ method: 'method4', id: uuid(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });
        const result2 = await new Promise(resolve => {
            client.send(JSON.stringify({ method: 'method5', id: uuid(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result1).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(String),
            method: 'method4',
            result: { method: 'method4' }
        });
        expect(result2).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(String),
            method: 'method5',
            result: { method: 'method5' }
        });
        expect(server.methodList).toStrictEqual(['method2', 'method3', 'method4', 'method5']);
    });

    it('通过method名称设置多个method', async () => {
        server.register('method6', () => {
            return { method: 'method6' };
        });
        server.register('method7', () => {
            return { method: 'method7' };
        });
        const result1 = await new Promise(resolve => {
            client.send(JSON.stringify({ method: 'method6', id: uuid(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });
        const result2 = await new Promise(resolve => {
            client.send(JSON.stringify({ method: 'method7', id: uuid(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result1).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(String),
            method: 'method6',
            result: { method: 'method6' }
        });
        expect(result2).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(String),
            method: 'method7',
            result: { method: 'method7' }
        });
        expect(server.methodList).toStrictEqual(['method2', 'method3', 'method4', 'method5', 'method6', 'method7']);
    });

    it('method抛出错误', async () => {
        const result = await new Promise(resolve => {
            server.register('method10', () => {
                throw {
                    code: 'USER_NOT_FOUND'
                };
            });
            client.send(JSON.stringify({ method: 'method10', id: uuid(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            id: expect.any(String),
            jsonrpc: '2.0',
            method: 'method10',
            error: {
                code: -32001,
                message: 'Method Request failed',
                data: {
                    code: 'USER_NOT_FOUND'
                }
            }
        });
    });

    it('method接收参数测试', async () => {
        const testParams = [{ test: 'params-test' }];
        const result = await new Promise(resolve => {
            server.register('method8', (params) => {
                resolve(params);
            });
            client.send(JSON.stringify({ method: 'method8', id: uuid(), params: testParams, jsonrpc: '2.0' }));
        });

        expect(result).toStrictEqual(testParams);
    });

    it('method内部向客户端主动发送消息', async () => {
        const test = { sub: 'test' };
        const result = await new Promise(resolve => {
            server.register('method9', (_params, socket) => {
                socket.send(JSON.stringify(test));
            });
            client.send(JSON.stringify({ method: 'method9', id: uuid(), params: [], jsonrpc: '2.0' }));
            client.on('message', data => {
                const res = JSON.parse(data.toString());

                if (typeof res === 'object' && res.sub === 'test') {
                    client.removeEventListener('message', () => { });
                    resolve(res);
                }
            });
        });

        expect(result).toStrictEqual(test);
    });
});
