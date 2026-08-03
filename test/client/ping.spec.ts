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


describe('客户端-ping', () => {

    it('ping', async () => {
        const result = await client.request('ping');

        expect(result.result).toBe('pong');
    });

});
