import { Link } from '../../src';
import instance from './base';

interface SocketAttr {
	id: string
	testAttr: string
	testSetAttr: string
	socketSetAttr: number
}

const { server, client } = instance<SocketAttr>(3326);

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

describe('服务器-其它功能接口', () => {
	it('getSocket', async () => {
		let ins: null | Link<SocketAttr> = null;

		server.register('getSocketId', (_params, socket) => {
			ins = socket;
			return { id: socket.id };
		});
		const result = await client.request('getSocketId', []);

		expect(server.getSocket((result.result as { id: string }).id)).toBe(ins);
	});

	it('getSockets', async () => {
		let ins: null | Link<SocketAttr> = null;

		server.use((_params, socket) => {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			ins = socket;
			return { id: socket.id };
		});
		const result = await client.request('getSocketId', []);

		expect(ins).not.toBeNull();
		const clents = server.getSockets(attr => attr.id === (result.result as { id: string }).id);

		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		expect(clents.has(ins)).toBe(true);
	});

	it('getSocketAttr-all', async () => {
		server.use(() => {
			return {
				testAttr: 'test-123'
			};
		});
		server.register('getAttr', (_params, socket) => {
			return socket.attribute;
		});
		const result = await client.request('getAttr', []);

		expect(server.getSocketAttr((result.result as { id: string }).id)).toStrictEqual(result.result);
	});

	it('setSocketAttr-one', async () => {
		server.register('getAttr', (_params, socket) => {
			server.setSocketAttr(socket.id, { testSetAttr: 'value-123' });
			return socket.attribute;
		});
		const result = await client.request('getAttr', []);

		expect(server.getSocketAttr((result.result as { id: string }).id, 'testSetAttr')).toStrictEqual('value-123');
	});

	it('setAttr', async () => {
		server.register('socketGetAttr', (_params, socket) => {
			socket.setAttr({ socketSetAttr: 11 });
			socket.setAttr('testSetAttr', '11');
			return socket.attribute;
		});
		const result = await client.request('socketGetAttr', []);

		expect(server.getSocketAttr((result.result as { id: string }).id, 'socketSetAttr')).toStrictEqual(11);
		expect(server.getSocketAttr((result.result as { id: string }).id, 'testSetAttr')).toStrictEqual('11');
	});

	it('getAttr-all', async () => {
		server.register('socketGetAttr', (_params, socket) => {
			return socket.getAttr();
		});
		const result = await client.request('socketGetAttr', []);

		expect(server.getSocketAttr((result.result as { id: string }).id)).toStrictEqual(result.result);
	});

	it('getAttr-one', async () => {
		server.register('socketGetAttr', (_params, socket) => {
			return socket.getAttr('socketSetAttr');
		});
		const result = await client.request('socketGetAttr', []);

		expect(result.result).toStrictEqual(11);
	});

	it('getAttr-partial', async () => {
		server.register('socketGetAttr', (_params, socket) => {
			return socket.getAttr('socketSetAttr', 'testSetAttr');
		});
		const result = await client.request('socketGetAttr', []);

		expect(result.result).toStrictEqual({
			socketSetAttr: 11,
			testSetAttr: '11'
		});
	});

	it('getSocketAttr-partal', async () => {
		server.register('getSocketId', (_params, socket) => {
			return { id: socket.id };
		});
		const result = await client.request('getSocketId', []);

		expect(server.getSocketAttr((result.result as { id: string }).id, 'socketSetAttr', 'testSetAttr')).toStrictEqual({
			socketSetAttr: 11,
			testSetAttr: '11'
		});
	});

	it('getSocketsAttr-partal', async () => {
		expect(server.getSocketsAttr(attr => {
			if (attr.testSetAttr === '11') {
				return true;
			}
			return false;
		}, 'socketSetAttr', 'testSetAttr')).toStrictEqual([{
			socketSetAttr: 11,
			testSetAttr: '11'
		}]);
	});

	it('getSocketsAttr-one', async () => {
		expect(server.getSocketsAttr(attr => {
			if (attr.testSetAttr === '11') {
				return true;
			}
			return false;
		}, 'socketSetAttr')).toStrictEqual([11]);
	});

	it('getSocketsAttr-all', async () => {
		expect(server.getSocketsAttr(attr => {
			if (attr.testSetAttr === '11') {
				return true;
			}
			return false;
		})).toStrictEqual([{
			id: expect.any(String),
			socketSetAttr: 11,
			testSetAttr: '11',
			testAttr: 'test-123'
		}]);
	});

	it('methodList', async () => {
		expect(server.methodList).toStrictEqual(['getSocketId', 'getAttr', 'socketGetAttr']);
	});
});
