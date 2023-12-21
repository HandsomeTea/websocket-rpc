import instance from './base';

const { server, client } = instance(3403);

beforeAll(async () => {
    server.start();
    await client.open();
});

afterAll(() => {
    client.close();
    server.close();
});


describe('客户端-ping', () => {

    it('ping', async () => {
        const result = await client.request('ping');

        expect(result.result).toBe('pong');
    });

});
