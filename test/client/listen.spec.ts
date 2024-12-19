import { uuid } from '../../src/lib';
import instance from './base';

const { server, client } = instance(3402);

beforeAll(async () => {
	server.start();
	await client.open();
});

afterAll(() => {
	client.close();
	server.close();
});


describe('客户端-listening', () => {

	it('正常数据监听', async () => {
		const str = 'test notice';

		server.register('method1', (_params, socket) => {
			socket.sendout({
				id: uuid(),
				method: 'method1',
				result: str
			});
		});

		const result = new Promise(resolve => {
			client.listening('method1', (_error, result) => {
				resolve(result);
			});
		});

		await client.request('method1');
		expect(await result).toBe(str);
	});

	it('错误结果监听', async () => {
		const error = {
			code: -32633,
			message: 'test error',
			data: { data: 'test error' }
		};

		server.register('method2', (_params, socket) => {
			socket.sendout({
				id: uuid(),
				method: 'method2',
				error
			});
			return { res: 'response' };
		});
		const result = new Promise(resolve => {
			client.listening('method2', (error) => {
				resolve(error);
			});
		});
		const response = await client.request('method2');

		expect(await result).toStrictEqual(error);
		expect(response.result).toStrictEqual({ res: 'response' });
	});
});
