import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import instance from './base';

const { server, client } = instance(3404);

beforeAll(async () => {
    server.start();
    await client.open();
});

afterAll(() => {
    client.close();
    server.close();
});


describe('内置method', () => {

    it('ping', async () => {
        const result = await client.ping();

        expect(result.result).toBe('pong');
    });

    it('isConnected', async () => {
        const result = await client.isConnected();

        expect(result.result).toStrictEqual({
            msg: 'connected',
            session: expect.any(String)
        });
    });

});
