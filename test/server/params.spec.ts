import instance from './base';

const { server, client } = instance(3305);

beforeAll(async () => {
    await new Promise(resolve => {
        server.start();
        client.on('open', () => resolve(0));
    });
});

afterAll(() => {
    client.close();
    server.close();
});

describe('参数测试', () => {

    test('参数正确', async () => {
        server.register('method1', () => {
            return 'test1';
        });
        const reqId = new Date().getTime();
        const result = await new Promise(resolve => {
            client.send(JSON.stringify({ method: 'method1', id: reqId, params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: reqId,
            method: 'method1',
            result: 'test1'
        });
        expect(server.methodList).toStrictEqual(['method1']);
    });

    test('非json参数,不可解析', async () => {
        const result = await new Promise(resolve => {
            client.send('asdasdasd');
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(Number),
            method: '',
            error: {
                code: -32700,
                message: 'Parse error',
                data: expect.any(String)
            }
        });
    });

    test('缺少id', async () => {
        const result = await new Promise(resolve => {
            client.send(JSON.stringify({ method: 'method1', params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(Number),
            method: 'method1',
            error: {
                code: -32602,
                message: 'Invalid params',
                data: expect.any(String)
            }
        });
    });

    test('缺少method', async () => {
        const result = await new Promise(resolve => {
            client.send(JSON.stringify({ id: new Date().getTime(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(Number),
            method: '',
            error: {
                code: -32602,
                message: 'Invalid params',
                data: expect.any(String)
            }
        });
    });

    test('缺少jsonrpc', async () => {
        const result = await new Promise(resolve => {
            client.send(JSON.stringify({ method: 'mm', id: new Date().getTime(), params: [] }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(Number),
            method: 'mm',
            error: {
                code: -32602,
                message: 'Invalid params',
                data: expect.any(String)
            }
        });
    });

    test('jsonrpc取值不合法', async () => {
        const result = await new Promise(resolve => {
            client.send(JSON.stringify({ method: 'mm', id: new Date().getTime(), params: [], jsonrpc: '2.1' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(Number),
            method: 'mm',
            error: {
                code: -32602,
                message: 'Invalid params',
                data: expect.any(String)
            }
        });
    });

    test('参数缺失多个', async () => {
        const result = await new Promise(resolve => {
            client.send(JSON.stringify({ id: new Date().getTime(), params: [] }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(Number),
            method: '',
            error: {
                code: -32602,
                message: 'Invalid params',
                data: expect.any(String)
            }
        });
    });
});
