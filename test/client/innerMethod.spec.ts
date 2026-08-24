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


describe('内置method', () => {

    it('ping', async () => {
        const result = await client.ping();

        expect(result.result).toBe('pong');
    });

    it('connectInfo', async () => {
        const result = await client.connectInfo();

        expect(result.result).toStrictEqual({
            msg: 'connected',
            session: expect.any(String)
        });
    });

});
