import { describe, it, afterAll, beforeAll, expect } from 'vitest';
import { WebSocketServer, BrowserWsClient, Attribute } from '../../src';

let server: WebSocketServer<Attribute>;
let client: BrowserWsClient;


beforeAll(async () => {
    server = new WebSocketServer<Attribute>({ port: 0 });
    await server.start();
    const port = server.port;

    client = new BrowserWsClient(`ws://localhost:${port}`);
    await client.open();
});


afterAll(() => {
    client.close();
    server.close();
});


describe('浏览器', () => {

    it('发送请求', async () => {
        server.register('test-method', params => {
            return params;
        });
        const result = await client.request('test-method', { a: 1 });

        expect(result.result).toStrictEqual({ a: 1 });
    });

});
