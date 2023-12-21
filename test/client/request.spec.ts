import instance from './base';

const { server, client } = instance(3401);

beforeAll(async () => {
    server.start();
    await client.open();
});

afterAll(() => {
    client.close();
    server.close();
});


describe('客户端-request', () => {

    it('接收成功返回', async () => {
        server.register('method1', (params) => {
            return {
                params,
                method: 'method1'
            };
        });
        const result = await client.request('method1', { test: 'test-params' });

        expect(result.result).toStrictEqual({
            params: { test: 'test-params' },
            method: 'method1'
        });
    });

    it('接收失败返回', async () => {
        const error = { error: 'error-params' };

        server.register('method2', () => {
            throw error;
        });
        const result = await client.request('method2');

        expect(result.error?.data).toStrictEqual(error);
    });

    it('接收超时返回', async () => {
        server.register('method3', async () => {
            await new Promise(resolve => {
                setTimeout(() => {
                    resolve(0);
                }, 4000);
            });
        });
        const result = await client.request('method3');

        expect(result.error?.data).toEqual('Time out');
    });

    it('接收延后返回', async () => {
        server.register('method4', async () => {
            await new Promise(resolve => {
                setTimeout(() => {
                    resolve(0);
                }, 2000);
            });
            return 1;
        });
        const result = await client.request('method4');

        expect(result.result).toBe(1);
    });
});
