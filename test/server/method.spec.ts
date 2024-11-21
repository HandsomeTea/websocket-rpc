import { uuid } from '../../src/lib';
import instance from './base';

const { server, client } = instance(3323);

beforeAll(async () => {
	await new Promise(resolve => {
		server.start();
		resolve(0);
	});
	await client.open()
});

afterAll(() => {
	client.close();
	server.close();
});

describe('服务器-method', () => {

	it('method不存在', async () => {
		const result = await client.request('method1', []);

		expect(result).toStrictEqual({
			error: {
				code: -32601,
				message: 'Method not found',
				data: expect.any(String)
			}
		});
	});

	it('通过method名称设置method', async () => {
		server.register('method2', () => {
			return {
				method: 'method2'
			};
		});
		const result = await client.request('method2', []);

		expect(result).toStrictEqual({
			result: { method: 'method2' }
		});
		expect(server.methodList).toStrictEqual(['method2']);
	});

	it('通过object设置method', async () => {
		server.register({
			method3() {
				return {
					method: 'method3'
				};
			}
		});
		const result = await client.request('method3', []);

		expect(result).toStrictEqual({
			result: { method: 'method3' }
		});
		expect(server.methodList).toStrictEqual(['method2', 'method3']);
	});

	it('通过object设置多个method', async () => {
		server.register({
			method4() {
				return {
					method: 'method4'
				};
			},
			method5() {
				return {
					method: 'method5'
				};
			}
		});
		const result1 = await client.request('method4', []);
		const result2 = await client.request('method5', []);

		expect(result1).toStrictEqual({
			result: { method: 'method4' }
		});
		expect(result2).toStrictEqual({
			result: { method: 'method5' }
		});
		expect(server.methodList).toStrictEqual(['method2', 'method3', 'method4', 'method5']);
	});

	it('通过method名称设置多个method', async () => {
		server.register('method6', () => {
			return { method: 'method6' };
		});
		server.register('method7', () => {
			return { method: 'method7' };
		});
		const result1 = await client.request('method6', []);
		const result2 = await client.request('method7', []);

		expect(result1).toStrictEqual({
			result: { method: 'method6' }
		});
		expect(result2).toStrictEqual({
			result: { method: 'method7' }
		});
		expect(server.methodList).toStrictEqual(['method2', 'method3', 'method4', 'method5', 'method6', 'method7']);
	});

	it('method抛出错误', async () => {
		server.register('method10', () => {
			throw {
				code: 'USER_NOT_FOUND'
			};
		});
		const result = await client.request('method10', []);

		expect(result).toStrictEqual({
			error: {
				code: -32001,
				message: 'Method Request failed',
				data: {
					code: 'USER_NOT_FOUND'
				}
			}
		});
	});

	it('method接收参数测试', async () => {
		const testParams = [{ test: 'params-test' }];
		const result = await new Promise(resolve => {
			server.register('method8', (params) => {
				resolve(params);
			});
			client.request('method8', testParams);
		});

		expect(result).toStrictEqual(testParams);
	});

	it('method内部向客户端主动发送消息', async () => {
		const test = { sub: 'test' };
		const result = await new Promise(resolve => {
			server.register('method9', (_params, socket) => {
				socket.send(JSON.stringify(test));
			});
			client.client.send(JSON.stringify({ method: 'method9', id: uuid(), params: [], jsonrpc: '2.0' }));
			client.client.on('message', data => {
				const res = JSON.parse(data.toString());

				if (typeof res === 'object' && res.sub === 'test') {
					client.client.removeEventListener('message', () => { });
					resolve(res);
				}
			});
		});

		expect(result).toStrictEqual(test);
	});
});
