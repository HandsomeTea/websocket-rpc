import server from './server';
import client from './client';

describe('websocket-server', () => {
    beforeEach(async () => {
        await new Promise(resolve => {
            server.receive(() => {
                console.log('成功');
                client.on('open', () => resolve(0));
            });
        });
    });

    afterEach(() => {
        client.close();
        server.close();
    });

    test('oneOf', async () => {
        const result = await new Promise(resolve => {
            client.send(JSON.stringify({ method: 'login', id: new Date().getTime(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(data.toString()));
        });

        expect(typeof result).toBe('string');
    });
});
