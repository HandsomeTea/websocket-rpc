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
        const result = await client.request('method2').catch(e => e);

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
        const result = await client.request('method3', undefined, { timeout: 3 }).catch(e => e);

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

    it('发送失败返回', async () => {
        const selfInstance = await import('../base');
        const { server, client } = await selfInstance.default(undefined, false);
        const result = client.request('method6', { test: 'test-params' });

        server.close();
        await expect(result).rejects.toThrow('WebSocket is not open!');
    });

    it('监听unknownMsg', async () => {
        const testStr = 'this is unknown message test';
        const result = new Promise(resove => {
            client.listening('unknownMsg', (_error, data) => {
                resove(data);
            });
        });

        server.register('method7', (_p, socket) => {
            socket.sendout({
                result: testStr
            });
        });
        await client.request('method7');
        expect((await result)).toStrictEqual(testStr);
    })

    it('接受once返回', async () => {
        server.register('method8', (_params, socket) => {
            socket.sendout({
                method: 'method8-notice-to-client',
                result: 'first-notice'
            });
            socket.sendout({
                method: 'method8-notice-to-client',
                result: 'second-notice'
            });
        });
        const result1 = new Promise(resolve => {
            const arr: Array<string> = [];

            client.listeningOnce('method8-notice-to-client', (_error, data) => {
                arr.push(data as string);
            });

            let timer: NodeJS.Timeout | null = setTimeout(() => {
                if (timer) {
                    clearInterval(timer);
                    timer = null;
                }
                resolve(arr);
            }, 3000);
        });
        const result2 = new Promise(resolve => {
            const arr: Array<string> = [];

            client.listening('method8-notice-to-client', (_error, data) => {
                arr.push(data as string);
            });
            let timer: NodeJS.Timeout | null = setTimeout(() => {
                if (timer) {
                    clearInterval(timer);
                    timer = null;
                }
                resolve(arr);
            }, 3000);
        })

        await client.request('method8');
        expect(await result1).toStrictEqual(['first-notice']);
        expect(await result2).toStrictEqual(['first-notice', 'second-notice']);
    });

    it('remove listening', async () => {
        let num = 0;
        const listener = () => {
            num++;
        };

        client.listening('method9-notice-to-client', listener);
        server.register('method9', (_params, socket) => {
            socket.sendout({
                method: 'method9-notice-to-client',
                result: 'method9-notice'
            });
        });
        await client.request('method9');
        expect(num).toBe(1);
        client.removeListening('method9-notice-to-client', listener);
        await client.request('method9');
        expect(num).toBe(1);
    });

    it('发送单个notify', async () => {
        const noticeParams = { test: 'test-notice-params' };
        const result = new Promise(resolve => {
            server.onNotice('method-notice1', params => {
                resolve(params);
            });
        });

        client.notify('method-notice1', noticeParams);
        expect(await result).toStrictEqual(noticeParams);
    });

    it('发送多个notify', async () => {
        const noticeParams = [{ test1: 'test-notice-params1' }, { test2: 'test-notice-params2' }];
        const result = new Promise(resolve => {
            const res: typeof noticeParams = [];

            server.onNotice('method-notice2', params => {
                res.push(params as typeof noticeParams[number]);
            });
            server.onNotice(params => {
                res.push(params as typeof noticeParams[number]);
            });
            let timer: NodeJS.Timeout | null = setInterval(() => {
                if (res.length === 2) {
                    if (timer) {
                        clearInterval(timer);
                        timer = null;
                    }
                    resolve(res);
                };
            }, 100);
        });

        client.notify([
            { notice: 'notice2', params: noticeParams[0] },
            { notice: 'method-for-batch-notice', params: noticeParams[1] }
        ]);
        expect(await result).toStrictEqual(noticeParams);
    });

    it('colse后状态检查', async () => {
        client.close();
        expect(client.status).toEqual(client.CLOSING);
        await new Promise(resolve => setTimeout(resolve, 500));
        expect(client.status).toEqual(client.CLOSED);
    });
});
