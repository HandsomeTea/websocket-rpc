import { describe, expect, beforeAll, afterAll, test } from 'vitest';
import { uuid } from '../../src/lib';
import instance from './base';

const { server, client } = instance(3325);

beforeAll(async () => {
	await new Promise(resolve => {
		server.start();
		resolve(0);
	});
	await client.open();
});

afterAll(() => {
	client.close();
	server.close();
});

describe('服务器-参数测试', () => {

	test('参数正确', async () => {
		server.register('method1', () => {
			return 'test1';
		});
		const result = await client.request('method1', []);

		expect(result).toStrictEqual({
			result: 'test1'
		});
		expect(server.methodList).toStrictEqual(['method1']);
	});

	test('批量访问', async () => {
		server.register('method2', (params) => {
			const [num1, num2] = params as Array<number>;

			return num1 + num2;
		});

		const _result = await client.request([
			{ method: 'method2', params: [5, 3] },
			{ method: 'method2', params: [1, 1], option: { timeout: 3 } }
		]);
		const result = _result.map(item => item.result as number);

		expect(result).toStrictEqual([8, 2]);
	});

	test('非json参数,不可解析', async () => {
		const result = await new Promise(resolve => {
			client.client.send('asdasdasd');
			client.client.once('message', data => resolve(JSON.parse(data.toString())));
		});

		expect(result).toStrictEqual({
			jsonrpc: '2.0',
			id: expect.any(String),
			method: expect.any(String),
			error: {
				code: -32700,
				message: 'Parse error',
				data: expect.any(String)
			}
		});
	});

	test('缺少id:应为notice', async () => {
		const params = 'notice str';
		const result = new Promise((resolve, reject) => {
			server.onNotice(data => {
				if (data !== params) {
					reject();
				}
			});
			server.onNotice('method1', data => {
				if (data !== params) {
					return reject();
				}
				resolve(data);
			});
		});

		client.client.send(JSON.stringify({ method: 'method1', params, jsonrpc: '2.0' }));
		expect(await result).toStrictEqual(params);
	});

	test('id非法:应为notice', async () => {
		const params = 'notice str1';
		const result = new Promise(resolve => {
			server.onNotice('method1', data => {
				resolve(data);
			});
		});

		client.client.send(JSON.stringify({ id: [2], method: 'method1', params, jsonrpc: '2.0' }));
		expect(await result).toStrictEqual(params);
	});

	test('缺少method', async () => {
		const result = await new Promise(resolve => {
			client.client.send(JSON.stringify({ id: uuid(), params: [], jsonrpc: '2.0' }));
			client.client.once('message', data => resolve(JSON.parse(data.toString())));
		});

		expect(result).toStrictEqual({
			jsonrpc: '2.0',
			id: expect.any(String),
			method: expect.any(String),
			error: {
				code: -32602,
				message: 'Invalid params',
				data: expect.any(String)
			}
		});
	});

	test('缺少jsonrpc', async () => {
		const result = await new Promise(resolve => {
			client.client.send(JSON.stringify({ method: 'mm', id: uuid(), params: [] }));
			client.client.once('message', data => resolve(JSON.parse(data.toString())));
		});

		expect(result).toStrictEqual({
			jsonrpc: '2.0',
			id: expect.any(String),
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
			client.client.send(JSON.stringify({ method: 'mm', id: uuid(), params: [], jsonrpc: '2.1' }));
			client.client.once('message', data => resolve(JSON.parse(data.toString())));
		});

		expect(result).toStrictEqual({
			jsonrpc: '2.0',
			id: expect.any(String),
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
			client.client.send(JSON.stringify({ id: uuid(), params: [] }));
			client.client.once('message', data => resolve(JSON.parse(data.toString())));
		});

		expect(result).toStrictEqual({
			jsonrpc: '2.0',
			id: expect.any(String),
			method: expect.any(String),
			error: {
				code: -32602,
				message: 'Invalid params',
				data: expect.any(String)
			}
		});
	});
});
