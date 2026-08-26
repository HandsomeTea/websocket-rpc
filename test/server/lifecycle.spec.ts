import { describe, it, expect } from 'vitest';
import instance from '../base';


describe('服务器-lifecycle', () => {

    it('客户端连接-online', async () => {
        const { server, client } = await instance(undefined, false);
        const result = new Promise((resolve, reject) => {
            client.listening('connection', error => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(true);
            });
        });
        let mark = false;

        server.online(
            () => {
                mark = true;
            },
            () => {
                throw new Error('server receive online error: test online');
            }
        );
        await client.open();

        expect(mark).toBe(true);
        await expect(result).rejects.toThrow({
            code: -32603,
            message: 'Internal error',
            data: 'Internal error'
        });

        client.close();
        server.close();
    });

    it('客户端连接-offline', async () => {
        const errorStr = 'server receive offline error: test offline';
        const { server, client } = await instance();
        let mark = false;

        server.offline(
            () => {
                mark = true;
            },
            () => {
                throw new Error(errorStr);
            }
        );
        const result = new Promise(resolve => {
            server.error<Error>(e => {
                resolve(e.message);
            });
        });

        client.close();

        // 客户端下线有closing的过程
        await new Promise(resolve => setTimeout(resolve, 500));
        expect(mark).toBe(true);
        await expect(result).resolves.toBe(errorStr);

        server.close();
    });

});
