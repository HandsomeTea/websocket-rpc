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


describe('client测试', () => {

    it('request测试', async () => {
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
});
