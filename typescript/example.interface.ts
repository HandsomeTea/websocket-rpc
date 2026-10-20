import { WebSocketClient, WebSocketServer } from '../dist';

// ===================================== typescript定义 ======================================
type Methods = {
    getUserInfo: (params: { userId: string }) => Promise<{ username: string, role: Array<'admin' | 'user'> }>;
    login: (params: { username: string, password: string }) => Promise<{ token: string }>;
}

type Method = keyof Methods;
type MethodParams<M extends Method> = Parameters<Methods[M]>[0];
type MethodReturn<M extends Method> = ReturnType<Methods[M]>;

type ClientNotifies = {
    userOnline: { userId: string, username: string };
    userOffline: { userId: string };
}

type ServerNotifies = {
    updatePwd: { userId: string, expiredAt: string };
    newMessage: { fromUserId: string, toUserId: string, content: string };
}

// ===================================== 初始化 ======================================
type SocketAttr = {
    userId: string;
    username: string;
    role: Array<'admin' | 'user'>;
    token: string;
}

const server = new WebSocketServer
    <SocketAttr, Method, keyof ClientNotifies, keyof ServerNotifies>
    ({ port: 3330 });
const client = new WebSocketClient<Method, keyof ClientNotifies, keyof ServerNotifies>('ws://localhost:3330');

// ===================================== 开始 ======================================

server.register('login', async (params: MethodParams<'login'>, socket) => {
    const { username, password } = params;

    console.log(username);
    if (!password) {
        throw '密码不能为空';
    }
    socket.sendout<ServerNotifies['updatePwd']>({
        method: 'updatePwd',
        result: {
            userId: '123',
            expiredAt: new Date().toISOString()
        }
    });
});

server.onNotice('userOnline', (params: ClientNotifies['userOnline']) => {
    console.log('userOnline', params.userId, params.username);
});

const result = await client.request<MethodReturn<'login'>, MethodParams<'login'>>('login', { username: 'test', password: '123456' });

console.log(result.token);

client.notify<ClientNotifies['userOnline']>('userOnline', { userId: '123', username: 'test' });

client.listening<ServerNotifies['updatePwd']>('updatePwd', (error, result) => {
    if (!error) {
        console.log(result);
    }
});
