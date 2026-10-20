import { WebSocketClient, WebSocketServer } from '../dist';

export type Method = 'getUserInfo' | 'login' | 'logout';
export type ClientNotifies = 'userOnline' | 'userOffline';
export type ServerNotifies = 'updatePwd' | 'newMessage';

// ===================================== 服务端 ======================================
type SocketAttr = {
    userId: string;
    username: string;
    role: Array<'admin' | 'user'>;
    token: string;
}

const server = new WebSocketServer
    <
        SocketAttr,
        Method,
        ClientNotifies,
        ServerNotifies
    >
    ({ port: 3330 });

server.use('login', (params: { username: string, password: string }) => {
    const { username, password } = params;

    if (!username || !password) {
        throw '用户名或密码不能为空';
    }
    return {
        username
    }
});

server.register('login', async (params: { username: string, password: string }) => {
    const { username, password } = params;

    console.log(username);
    if (!password) {
        throw '密码不能为空';
    }

    // 登录逻辑
});

server.onNotice('userOffline', (params: { user: string }, _attr) => {
    console.log(params);
});

server.start();

// ===================================== 客户端 ======================================
const client = new WebSocketClient<Method, ClientNotifies, ServerNotifies>('ws://localhost:3330');

const result = await client.request('login', { username: 'test', password: 'test' }) as { id: string, role: Array<'admin' | 'user'>, token: string };

client.notify('userOnline', { userId: result.id });

client.listening('updatePwd', (error, data) => {
    if (!error) {
        console.log(data)
    }
});
