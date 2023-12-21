import WebSocket from 'ws';
import { ClientRequestArgs } from 'http';
import { WsClient, Socket } from './typings';
import { uuid } from './lib';

export class WebsocketClient implements WsClient.Client {
    private webSocket: WebSocket;
    private addr: string | URL;
    private configs: WebSocket.ClientOptions | ClientRequestArgs;
    private options: WsClient.Options = { timeout: 10 };
    private record: Record<string, { result: Socket.MethodResponse['result'], error: Socket.MethodResponse['error'] }> = {};

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

    private getRecordKey(method: string, id: string) {
        return `${method}-${id}`;
    }

    async open() {
        const self = this;

        await new Promise((resolve, reject) => {
            this.webSocket = new WebSocket(this.addr, this.configs);
            this.webSocket.on('message', data => {
                const res = JSON.parse(data.toString()) as Socket.MethodResponse;
                const cacheId = self.getRecordKey(res.method, res.id);

                if (self.record[cacheId]) {
                    if (res.error) {
                        self.record[cacheId].error = res.error;
                    } else {
                        self.record[cacheId].result = res.result;
                    }
                } else {
                    if (res.method) {
                        self.webSocket.emit(res.method, res.error, res.result);
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
        const id = uuid();
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
                            _self.error = {
                                code: -32001,
                                message: 'Time out',
                                data: 'Time out'
                            };
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

                    set result(data: Socket.MethodResponse['result']) {
                        this.clearTimer();
                        resolve({ result: data });
                    }

                    set error(error: Socket.MethodResponse['error']) {
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

    listening(method: string, callback: WsClient.ListenCallbackFn, once?: boolean) {
        if (Boolean(once) === true) {
            this.webSocket.once(method, callback);
        } else {
            this.webSocket.on(method, callback);
        }
    }

    get removeListening() {
        return this.webSocket.removeListener;
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
