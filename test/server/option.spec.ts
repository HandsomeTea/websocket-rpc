import WS from 'ws';
import { WebsocketServer } from '../../src';
import zlib from 'zlib';
import { uuid } from '../../src/lib';

describe('服务器-配置选项', () => {

    it('数据压缩', async () => {
        const port = 3308;
        const server = new WebsocketServer({ port }, { compression: 'zlib' });

        server.start();
        const client = new WS(`ws://localhost:${port}`);

        const result = await new Promise(resolve => {
            client.on('open', () => {
                client.send(JSON.stringify({ method: 'ping', id: uuid(), params: [], jsonrpc: '2.0' }));
                client.once('message', data => {
                    client.close();
                    server.close();
                    resolve(JSON.parse(zlib.inflateSync(data as Buffer).toString()));
                });
            });
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(String),
            method: 'ping',
            result: 'pong'
        });
    });
});
