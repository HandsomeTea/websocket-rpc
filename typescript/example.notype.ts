import { WebSocketClient, WebSocketServer } from '../dist';

const server = new WebSocketServer({ port: 3330 });

await server.start();
const client = new WebSocketClient('ws://localhost:3330');

await client.open();

server.use('login', (params: { username: string, password: string }, socket) => {
    const { username, password } = params;

    console.log(username, password);
    socket.sendout({
        method: 'updatePwd',
        result: {
            userId: '123',
            expiredAt: new Date().toISOString()
        }
    })
});

server.register('login', async (params: { username: string, password: string }) => {
    console.log(params);
    return { token: '123' };
});

const result = await client.request('login', { username: 'test', password: '123456' });

console.log(result);

client.notify('userOnline', { userId: '123', username: 'test' });

client.listening('updatePwd', (error, data) => {
    if (!error) {
        console.log(data)
    }
});
