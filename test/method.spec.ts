import instance from './base';

const { server, client } = instance(3303);

beforeAll(async () => {
    await new Promise(resolve => {
        server.receive(() => {
            client.on('open', () => resolve(0));
        });
    });
});

afterAll(() => {
    client.close();
    server.close();
});

describe('method', () => {

    it('method不存在', async () => {
        const result = await new Promise(resolve => {
            client.send(JSON.stringify({ method: 'method1', id: new Date().getTime(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(Number),
            error: {
                code: -32601,
                message: 'Method not found',
                data: expect.any(String)
            }
        });
    });

    it('通过method名称设置method', async () => {
        const result = await new Promise(resolve => {
            server.method('method2', () => {
                return {
                    method: 'method2'
                }
            });
            client.send(JSON.stringify({ method: 'method2', id: new Date().getTime(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(Number),
            result: { method: 'method2' }
        });
        expect(server.methodList).toStrictEqual(['method2'])
    });

    it('通过object设置method', async () => {
        const result = await new Promise(resolve => {
            server.method({
                method3() {
                    return {
                        method: 'method3'
                    }
                }
            });
            client.send(JSON.stringify({ method: 'method3', id: new Date().getTime(), params: [], jsonrpc: '2.0' }));
            client.once('message', data => resolve(JSON.parse(data.toString())));
        });

        expect(result).toStrictEqual({
            jsonrpc: '2.0',
            id: expect.any(Number),
            result: { method: 'method3' }
        });
        expect(server.methodList).toStrictEqual(['method2', 'method3'])
    });
});
