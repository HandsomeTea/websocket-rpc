import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import instance from '../base';
import { WebSocketServer, WebSocketClient, Attribute } from '../../src';

let server: WebSocketServer<Attribute>;
let client: WebSocketClient;


beforeAll(async () => {
    ({ server, client } = await instance());
});


afterAll(() => {
    client.close();
    server.close();
});


describe('客户端-request', () => {

    it('接收成功返回', async () => {
        server.register('method1', (params) => {
            return {
                params,
                method: 'method1'
            };
        });
        const result = await client.request('method1', { test: 'test-params' });

        expect(result.result).toStrictEqual({
            params: { test: 'test-params' },
            method: 'method1'
        });
    });

    it('接收失败返回', async () => {
        const error = { error: 'error-params' };

        server.register('method2', () => {
            throw error;
        });
        const result = await client.request('method2');

        expect(result.error?.data).toStrictEqual(error);
    });

    it('接收超时返回', async () => {
        server.register('method3', async () => {
            await new Promise(resolve => {
                setTimeout(() => {
                    resolve(0);
                }, 4000);
            });
        });
        const result = await client.request('method3', undefined, { timeout: 3 });

        expect(result.error?.data).toEqual('Time out');
    });

    it('接收延后返回', async () => {
        server.register('method4', async () => {
            await new Promise(resolve => {
                setTimeout(() => {
                    resolve(0);
                }, 2000);
            });
            return 1;
        });
        const result = await client.request('method4');

        expect(result.result).toBe(1);
    });

    it('接收重复返回', async () => {
        server.register('method5', async params => {
            return await new Promise(resolve => {
                setTimeout(() => {
                    resolve(params);
                }, 2000);
            });
        });
        const sameId = 'same-id-test';

        client.client.send(JSON.stringify({ method: 'method5', id: sameId, params: [1, 2], jsonrpc: '2.0' }));
        const result = new Promise(resolve => {
            client.client.send(JSON.stringify({ method: 'method5', id: sameId, params: [2, 2], jsonrpc: '2.0' }));
            client.client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(await result).toStrictEqual({
            jsonrpc: '2.0',
            id: sameId,
            method: 'method5',
            error: {
                code: -32600,
                message: 'Invalid Request',
                data: `Duplicate request id: ${sameId}`
            }
        });
    });
});
