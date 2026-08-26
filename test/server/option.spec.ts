import { describe, expect, it, vi } from 'vitest';
import instance from '../base';
import { uuid } from '../../src/lib';


describe('服务器-配置选项', () => {

    it('日志开启', async () => {
        const stdoutSpy = vi.spyOn(process.stdout, 'write');

        vi.resetModules();
        const selfInstance = await import('../base');
        const { server, client } = await selfInstance.default({ server: { log: true } });
        const testLogStr = 'Hello, Default Log Config Test!';

        server.register('method-for-log-test', (_params, socket) => {
            if (socket.logger) {
                socket.logger().info(testLogStr);
            }
        });
        await client.request('method-for-log-test');

        client.close();
        server.close();
        await new Promise(resolve => setTimeout(resolve, 500));

        expect(stdoutSpy).toHaveBeenCalledTimes(5);
        expect(stdoutSpy).toHaveBeenCalledWith(
            expect.stringContaining(testLogStr)
        );
    });

    it('自定义日志函数', async () => {
        const { server, client } = await instance({ server: { log: () => console } });
        const testLogStr = 'Hello, Console Test!';

        server.register('method-for-console-test', (_params, socket) => {
            if (socket.logger) {
                socket.logger().info(testLogStr);
            }
        });
        const stdoutSpy = vi.spyOn(console, 'info').mockImplementation(() => { });
        await client.request('method-for-console-test');

        client.close();
        server.close();
        await new Promise(resolve => setTimeout(resolve, 500));

        expect(stdoutSpy).toHaveBeenCalledTimes(1);
        expect(stdoutSpy).toHaveBeenCalledWith(testLogStr);
    });

    it('自定义json序列化', async () => {
        const deserialize = (data: string) => {
            const arr = data.split(';').filter((item) => item !== '');
            const obj: Record<string, unknown> = {};

            for (const item of arr) {
                const [key, value] = item.split('=');
                obj[key] = value;
            }
            return obj;
        };
        const serialize = (data: unknown) => {
            let str = '';
            const _data = data as Record<string, unknown>;

            for (const key in _data) {
                str += `${key}=${_data[key]};`
            }

            return str;
        };
        const { server, client } = await instance({
            server: {
                jsonSerializer: {
                    serialize,
                    deserialize
                }
            },
            client: {
                jsonSerializer: {
                    serialize,
                    deserialize
                }
            }
        });

        const testData = {
            jsonrpc: '2.0',
            id: uuid(),
            method: 'method-for-json-serialize-test'
        };
        const sendData = serialize(testData);

        server.register('method-for-json-serialize-test', () => 'test-custom-serialize-success-mark');
        const result = await new Promise(resolve => {
            client.client.send(sendData);
            client.client.once('message', data => resolve(data.toString()));
        });

        client.close();
        server.close();

        expect(deserialize(result as string)).toStrictEqual({
            ...testData,
            result: 'test-custom-serialize-success-mark'
        });
    });
});
