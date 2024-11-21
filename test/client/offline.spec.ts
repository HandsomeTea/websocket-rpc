import instance from './base';

const { server, client } = instance(3403);

beforeAll(async () => {
	server.start();
	await client.open();
});

afterAll(() => {
	client.close();
});


describe('客户端-offline', () => {

	it('offline', async () => {
		const result = await new Promise(resolve => {
			client.offline(() => {
				resolve('offline');
			});
			client.close();
		})

		expect(result).toBe('offline');
	});

});
