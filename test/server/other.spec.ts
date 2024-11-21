import { Link } from '../../src';
import { uuid } from '../../src/lib';
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
        client.on('open', () => resolve(0));
    });
});

afterAll(() => {
    client.close();
    server.close();
});

describe('服务器-其它功能接口', () => {
    it('getSocket', async () => {
        let ins: null | Link<SocketAttr> = null;
        const result: { result: { id: string } } = await new Promise(resolve => {
            server.register('getSocketId', (_params, socket) => {
                ins = socket;
                return { id: socket.id };
            });
            client.once('message', data => resolve(JSON.parse(data.toString())));
            client.send(JSON.stringify({ method: 'getSocketId', id: uuid(), params: [], jsonrpc: '2.0' }));
        });

        expect(server.getSocket(result.result.id)).toBe(ins);
    });

    it('getSockets', async () => {
        let ins: null | Link<SocketAttr> = null;
        const result: { result: { id: string } } = await new Promise(resolve => {
            server.use((_params, socket) => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                ins = socket;
                return { id: socket.id };
            });
            client.once('message', data => resolve(JSON.parse(data.toString())));
            client.send(JSON.stringify({ method: 'getSocketId', id: uuid(), params: [], jsonrpc: '2.0' }));
        });

        expect(ins).not.toBeNull();
        const clents = server.getSockets(attr => attr.id === result.result.id);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(clents.has(ins)).toBe(true);
    });

    it('getSocketAttr-all', async () => {
        const result: { result: { id: string } } = await new Promise(resolve => {
            server.use(() => {
                return {
                    testAttr: 'test-123'
                };
            });
            server.register('getAttr', (_params, socket) => {
                return socket.attribute;
            });
            client.once('message', data => resolve(JSON.parse(data.toString())));
            client.send(JSON.stringify({ method: 'getAttr', id: uuid(), params: [], jsonrpc: '2.0' }));
        });

        expect(server.getSocketAttr(result.result.id)).toStrictEqual(result.result);
    });

    it('setSocketAttr-one', async () => {
        const result: { result: { id: string } } = await new Promise(resolve => {
            server.register('getAttr', (_params, socket) => {
                server.setSocketAttr(socket.id, { testSetAttr: 'value-123' });
                return socket.attribute;
            });
            client.once('message', data => resolve(JSON.parse(data.toString())));
            client.send(JSON.stringify({ method: 'getAttr', id: uuid(), params: [], jsonrpc: '2.0' }));
        });

        expect(server.getSocketAttr(result.result.id, 'testSetAttr')).toStrictEqual('value-123');
    });

    it('setAttr', async () => {
        const result: { result: { id: string } } = await new Promise(resolve => {
            server.register('socketGetAttr', (_params, socket) => {
                socket.setAttr({ socketSetAttr: 11 });
                socket.setAttr('testSetAttr', '11');
                return socket.attribute;
            });
            client.once('message', data => resolve(JSON.parse(data.toString())));
            client.send(JSON.stringify({ method: 'socketGetAttr', id: uuid(), params: [], jsonrpc: '2.0' }));
        });

        expect(server.getSocketAttr(result.result.id, 'socketSetAttr')).toStrictEqual(11);
        expect(server.getSocketAttr(result.result.id, 'testSetAttr')).toStrictEqual('11');
    });

    it('getAttr-all', async () => {
        const result: { result: { id: string, socketSetAttr: number, testSetAttr: string, testAttr: string } } = await new Promise(resolve => {
            server.register('socketGetAttr', (_params, socket) => {
                return socket.getAttr();
            });
            client.once('message', data => resolve(JSON.parse(data.toString())));
            client.send(JSON.stringify({ method: 'socketGetAttr', id: uuid(), params: [], jsonrpc: '2.0' }));
        });

        expect(server.getSocketAttr(result.result.id)).toStrictEqual(result.result);
    });

    it('getAttr-one', async () => {
        const result: { result: { id: string } } = await new Promise(resolve => {
            server.register('socketGetAttr', (_params, socket) => {
                return socket.getAttr('socketSetAttr');
            });
            client.once('message', data => resolve(JSON.parse(data.toString())));
            client.send(JSON.stringify({ method: 'socketGetAttr', id: uuid(), params: [], jsonrpc: '2.0' }));
        });

        expect(result.result).toStrictEqual(11);
    });

    it('getAttr-partial', async () => {
        const result: { result: { id: string } } = await new Promise(resolve => {
            server.register('socketGetAttr', (_params, socket) => {
                return socket.getAttr('socketSetAttr', 'testSetAttr');
            });
            client.once('message', data => resolve(JSON.parse(data.toString())));
            client.send(JSON.stringify({ method: 'socketGetAttr', id: uuid(), params: [], jsonrpc: '2.0' }));
        });

        expect(result.result).toStrictEqual({
            socketSetAttr: 11,
            testSetAttr: '11'
        });
    });

    it('getSocketAttr-partal', async () => {
        const result: { result: { id: string } } = await new Promise(resolve => {
            server.register('getSocketId', (_params, socket) => {
                return { id: socket.id };
            });
            client.once('message', data => resolve(JSON.parse(data.toString())));
            client.send(JSON.stringify({ method: 'getSocketId', id: uuid(), params: [], jsonrpc: '2.0' }));
        });

        expect(server.getSocketAttr(result.result.id, 'socketSetAttr', 'testSetAttr')).toStrictEqual({
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
