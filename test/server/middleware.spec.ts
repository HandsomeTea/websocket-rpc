import instance from './base';

const { server, client } = instance(3324);

beforeAll(async () => {
	await new Promise(resolve => {
		server.start();
		server.register('method1', (_params: unknown, socket) => {
			return {
				result: 'success',
				...socket.attribute
			};
		});
		resolve(0);
	});
	await client.open();
});

afterAll(() => {
	client.close();
	server.close();
});

describe('服务器-middleware', () => {

	it('为某个method设置middleware', async () => {
		server.use('method1', () => {
			return {
				status: 'method1-success'
			};
		});
		const result = await client.request('method1', []);

		expect(result).toStrictEqual({
			result: { result: 'success', status: 'method1-success' }
		});
		expect(server.methodList).toStrictEqual(['method1']);
	});

	it('设置正对所有method的middleware', async () => {
		server.use(() => {
			return {
				status: 'method1-success-global-middleware'
			};
		});
		const result = await client.request('method1', []);

		expect(result).toStrictEqual({
			result: { result: 'success', status: 'method1-success-global-middleware' }
		});
		expect(server.methodList).toStrictEqual(['method1']);
	});

	it('middleware抛出错误', async () => {
		server.use(() => {
			throw ['test', 'error'];
		});
		const result = await client.request('method1', []);

		expect(result).toStrictEqual({
			error: {
				code: -32001,
				message: 'Method Request failed',
				data: ['test', 'error']
			}
		});
		expect(server.methodList).toStrictEqual(['method1']);
	});
});
