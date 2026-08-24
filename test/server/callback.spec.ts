import { describe, it, expect } from 'vitest';
import { uuid } from '../../src/lib';
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
                server.close();
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
                id: data?.id || uuid(),
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
                id: req?.id || uuid(),
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
                id: req?.id || uuid(),
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
});
