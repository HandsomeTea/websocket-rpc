import { describe, it, expect } from 'vitest';
import instance from '../base';


describe('服务器-回调事件', () => {

    it('online', async () => {
        const { server, client } = await instance(undefined, false);
        const testData = {
            method: 'test-notice',
            result: 'online'
        };
        const result = new Promise(async resolve => {
            server.online(() => {
                resolve(testData);
            });
        });

        await client.open();
        client.close();
        server.close();
        expect(await result).toStrictEqual(testData);
    });

    it('offline', async () => {
        let sessionId = '';
        const { server, client } = await instance(undefined, false);
        const result = new Promise(async resolve => {
            server.online(socket => {
                sessionId = socket.id;
            });
            server.offline((_attribute, id) => {
                resolve(id);
            });
        });
        await client.open();

        client.close();
        server.close();
        expect(await result).toEqual(sessionId);
    });

    it('method error', async () => {
        const { server, client } = await instance();

        server.error<Error>((error, socket, data) => {
            socket.sendout({
                id: data?.id,
                method: 'm1',
                result: error.message
            });
        });

        server.register('m1', () => {
            throw new Error('method-error');
        });
        const result = await client.request('m1');

        client.close();
        server.close();
        expect(result.result).toEqual('method-error');
    });

    it('某个method的中间件error', async () => {
        const { server, client } = await instance();

        server.error<Error>((error, socket, req) => {
            socket.sendout({
                id: req?.id,
                method: 'm2',
                result: error.message
            });
        });
        server.use('m2', () => {
            throw new Error('m1-middleware-error');
        });
        server.register('m2', () => { });
        const result = await client.request('m2');

        client.close();
        server.close();
        expect(result.result).toEqual('m1-middleware-error');
    });

    it('对所有method起作用的中间件error', async () => {
        const { server, client } = await instance();

        server.error<Error>((error, socket, req) => {
            socket.sendout({
                id: req?.id,
                method: 'm3',
                result: error.message
            });
        });
        server.use(() => {
            throw new Error('middleware-error');
        });
        server.register('m3', () => { });
        const result = await client.request('m3');

        client.close();
        server.close();
        expect(result.result).toEqual('middleware-error');
    });

    it('没有注册error处理函数，sendout兜底中间件', async () => {
        const { server, client } = await instance();

        server.register('m4', () => { });
        server.use('m4', (_params) => {
            const params = _params as { for: string };

            if (params.for === 'all-middleware') {
                return;
            }
            throw new Error('m4-middleware-error');
        })
        server.use(_params => {
            const params = _params as { for: string };

            if (params.for !== 'all-middleware') {
                return;
            }
            throw new Error('all-middleware-error');
        });
        const result1 = await client.request('m4', { for: 'all-middleware' }).catch(e => e);
        const result2 = await client.request('m4', {}).catch(e => e);

        client.close();
        server.close();
        expect(result1.error).toStrictEqual({
            code: -32001,
            message: 'Method Request failed',
            data: { name: 'Error', message: 'all-middleware-error' }
        });
        expect(result2.error).toStrictEqual({
            code: -32001,
            message: 'Method Request failed',
            data: { name: 'Error', message: 'm4-middleware-error' }
        });
    });

    it('没有注册error处理函数，sendout兜底method', async () => {
        const { server, client } = await instance();

        server.register('m5', () => {
            throw new Error('m5-error');
        });
        const result = await client.request('m5').catch(e => e);

        client.close();
        server.close();
        expect(result.error).toStrictEqual({
            code: -32001,
            message: 'Method Request failed',
            data: { name: 'Error', message: 'm5-error' }
        })
    });
});
