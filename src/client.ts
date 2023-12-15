import WebSocket from 'ws';
import { ClientRequestArgs } from 'http';
import { WsClient, Socket } from './typings';

export class WebsocketClient implements WsClient.Client {
    private webSocket: WebSocket;
    private addr: string | URL;
    private configs: WebSocket.ClientOptions | ClientRequestArgs;
    private options: WsClient.Options = { timeout: 10 };
    private noticeFn: Array<Record<string, WsClient.NoticeCallbackFn> | WsClient.NoticeCallbackFn> = [];
    private record: Record<string, { result: Socket.MethodResult['result'], error: Socket.MethodResult['error'] }> = {};

    constructor(address: string | URL, configs?: WebSocket.ClientOptions | ClientRequestArgs, options?: WsClient.Options) {
        this.addr = address;
        if (configs) {
            this.configs = configs;
        }
        if (options) {
            if (options.timeout) {
                this.options.timeout = options.timeout;
            }
        }
    }

    private getRecordKey(method: string, id: number) {
        return `${method}-${id}`;
    }

    async open() {
        const self = this;

        await new Promise((resolve, reject) => {
            this.webSocket = new WebSocket(this.addr, this.configs);
            this.webSocket.on('message', data => {
                const res = JSON.parse(data.toString());
                const cacheId = self.getRecordKey(res.method, res.id);

                if (self.record[cacheId]) {
                    if (res.error) {
                        self.record[cacheId].error = res.error;
                    } else {
                        self.record[cacheId].result = res.result;
                    }
                } else {
                    for (const fn of self.noticeFn) {
                        if (typeof fn === 'function') {
                            fn(res.error || null, res.result);
                        } else if (typeof fn === 'object' && typeof fn[res.method] === 'function') {
                            fn[res.method](res.error || null, res.result);
                        }
                    }
                }
            });
            this.webSocket.on('open', resolve);
            this.webSocket.on('error', reject);
        });
    }

    async request(method: string, params?: unknown): Promise<WsClient.RequestResult> {
        if (this.status !== WebSocket.OPEN || !method) {
            return null;
        }
        const id = new Date().getTime();
        const cacheId = this.getRecordKey(method, id);
        const self = this;
        let result = null;

        try {
            result = await new Promise((resolve, reject) => {
                this.record[cacheId] = new class Cache {
                    private timer: number;
                    constructor() {
                        // eslint-disable-next-line consistent-this, @typescript-eslint/no-this-alias
                        const _self = this;

                        this.timer = setTimeout(() => {
                            _self.clearTimer();
                            reject({
                                error: {
                                    code: -32001,
                                    message: 'Time out',
                                    data: 'Time out'
                                }
                            });
                        }, self.options.timeout * 1000) as unknown as number;

                        self.webSocket.send(JSON.stringify({
                            jsonrpc: '2.0',
                            id,
                            method,
                            params: params || {}
                        }));
                    }

                    private clearTimer() {
                        if (this.timer) {
                            clearTimeout(this.timer);
                            this.timer = null;
                        }
                        delete self.record[cacheId];
                    }

                    set result(data: Socket.MethodResult['result']) {
                        this.clearTimer();
                        resolve({ result: data });
                    }

                    set error(error: Socket.MethodResult['error']) {
                        this.clearTimer();
                        reject({ error });
                    }
                };
            });
        } catch (e) {
            result = e;
        }

        return result;
    }

    async ping(): Promise<WsClient.RequestResult> {
        return await this.request('ping');
    }

    /**
     * 为某个method设置一个或多个监听事件
     *
     * @param {string} method
     * @param {...Array<WsClient.NoticeCallbackFn>} args
     * @memberof WebsocketClient
     */
    onNotice(method: string, ...args: Array<WsClient.NoticeCallbackFn>): void;
    /**
     * 为所有method设置一个或多个监听事件
     *
     * @param {WsClient.NoticeCallbackFn} method
     * @param {...Array<WsClient.NoticeCallbackFn>} args
     * @memberof WebsocketClient
     */
    onNotice(method: WsClient.NoticeCallbackFn, ...args: Array<WsClient.NoticeCallbackFn>): void;
    onNotice(method: string | WsClient.NoticeCallbackFn, ...args: Array<WsClient.NoticeCallbackFn>) {
        if (typeof method === 'string') {
            for (const callback of args) {
                if (typeof callback === 'function') {
                    this.noticeFn.push({ [method]: callback });
                }
            }
        } else if (typeof method === 'function') {
            this.noticeFn.push(method);

            if (args.length > 0) {
                for (const callback of args) {
                    if (typeof callback === 'function') {
                        this.noticeFn.push(callback);
                    }
                }
            }
        }
    }

    get CONNECTING() {
        return WebSocket.CONNECTING;
    }

    get OPEN() {
        return WebSocket.OPEN;
    }

    get CLOSING() {
        return WebSocket.CLOSING;
    }

    get CLOSED() {
        return WebSocket.CLOSED;
    }

    get status() {
        return this.webSocket.readyState;
    }

    close() {
        this.webSocket.close();
    }
}
