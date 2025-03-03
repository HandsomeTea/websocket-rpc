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

	test('缺少id', async () => {
		const result = await new Promise(resolve => {
			client.client.send(JSON.stringify({ method: 'method1', params: [], jsonrpc: '2.0' }));
			client.client.once('message', data => resolve(JSON.parse(data.toString())));
		});

		expect(result).toStrictEqual({
			jsonrpc: '2.0',
			id: expect.any(String),
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
