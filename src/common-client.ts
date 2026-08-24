import type { Socket, WsClient } from './typings.js';

export const CLIENT_DEFAULT_TIMEOUT = 10;

interface WebSocketLike {
    send(data: string): void;
    readonly readyState: number;
    close(code?: number, reason?: string): void;
}

export abstract class BaseWsClient<WebSocketType extends WebSocketLike, Method extends string = string, Notice extends string = string> implements WsClient.Client<Method, Notice> {

    abstract open(): Promise<void>;

    protected webSocket!: WebSocketType;

    protected options: WsClient.Options = { timeout: CLIENT_DEFAULT_TIMEOUT };

    protected record: Record<string, { result: Socket.ServerMessage['result'], error: Socket.ServerMessage['error'] }> = {};

    protected _close: Array<() => void> = [];

    protected listeners: Record<string, Set<WsClient.ListeningCallbackFn>> = {};

    private onceListenerMap: Record<string, WeakMap<WsClient.ListeningCallbackFn, WsClient.ListeningCallbackFn>> = {};

    private idGenerator = new JsonRpcIdGenerator();

    protected clearPendingRequests(info: string) {
        const pending = Object.values(this.record);

        this.record = {};
        for (const cache of pending) {
            cache.error = {
                code: -32002,
                message: info,
                data: null
            };
        }
    }

    protected getRecordKey(id: string | number | null, method?: string) {
        if ((id || id === 0) && method) {
            return `${method}-${id}`;
        }
    }

    protected emit(method: string, data: WsClient.RequestResult): void {
        const targets = Array.from(this.listeners[method] || []);

        for (const fn of targets) {
            fn(data.error, data.result);
        }
    }

    listening(method: string, callback: WsClient.ListeningCallbackFn, once?: boolean): void {
        if (!this.listeners[method]) {
            this.listeners[method] = new Set();
        }
        if (once) {
            const wrapper: typeof callback = (...args: Parameters<typeof callback>) => {
                this.removeListening(method, callback);
                callback(...args);
            };

            if (!this.onceListenerMap[method]) {
                this.onceListenerMap[method] = new WeakMap();
            }
            this.onceListenerMap[method].set(callback, wrapper);
            this.listeners[method].add(wrapper);
        } else {
            this.listeners[method].add(callback);
        }
    }

    removeListening(method: string, callback: WsClient.ListeningCallbackFn): void {
        const wrapper = this.onceListenerMap[method]?.get(callback);

        if (wrapper) {
            this.listeners[method]?.delete(wrapper);
            this.onceListenerMap[method]?.delete(callback);
        } else {
            this.listeners[method]?.delete(callback);
        }
    }

    /**
     * 发送一个method请求
     * @param method
     * @param params
     * @param option 可选项
     * @param option.timeout 可选项，超时时间，单位秒, 0表示不设置超时
     * @returns {Promise<RequestResult>}
     */
    private async _request(method: Method, params?: unknown, option?: { timeout: number }): Promise<WsClient.RequestResult> {
        if (this.status !== WebSocket.OPEN) {
            throw new Error('WebSocket is not open!');
        }
        if (!method) {
            throw new Error('method name is required!');
        }
        const id = this.idGenerator.nextId();
        const cacheId = this.getRecordKey(id, method) as string;
        const self = this;
        const { timeout } = option || {};

        try {
            return await new Promise((resolve, reject) => {
                this.record[cacheId] = new class Cache {
                    private timer: number | null = null;
                    constructor() {
                        const _self = this;
                        const _timeout = timeout ?? self.options.timeout ?? CLIENT_DEFAULT_TIMEOUT;

                        if (_timeout !== 0) {
                            this.timer = setTimeout(() => {
                                _self.error = {
                                    code: -32003,
                                    message: 'Time out',
                                    data: 'Time out'
                                };
                            }, _timeout * 1000) as unknown as number;
                        }

                        try {
                            self.webSocket.send(JSON.stringify({
                                jsonrpc: '2.0',
                                id,
                                method,
                                params
                            }));
                        } catch (e) {
                            console.log(e);
                        }
                    }

                    private clearTimer() {
                        if (this.timer) {
                            clearTimeout(this.timer);
                            this.timer = null;
                        }
                        delete self.record[cacheId];
                    }

                    set result(data: Socket.ServerMessage['result']) {
                        this.clearTimer();
                        resolve({ result: data });
                    }

                    set error(error: Socket.ServerMessage['error']) {
                        this.clearTimer();
                        reject({ error });
                    }
                };
            });
        } catch (e) {
            return e as WsClient.RequestResult;
        }
    }

    /**
     * 批量发送多个method请求，结果返回顺序与请求顺序一致
     *
     * @param {Method} arg.method method名称
     * @param {*} [arg.params]
     * @param {object} [arg.option] Object
     * @param {number} [arg.option.timeout] 超时时间，单位为秒，默认10秒, 0表示不设置超时
     * @returns {Promise<Array<RequestResult>>}
     */
    request(arg: Array<{ method: Method, params?: unknown, option?: { timeout: number } }>): Promise<Array<WsClient.RequestResult>>;

    /**
     * 发送一个method请求
     *
     * @param {Method} method method名称
     * @param {*} [params]
     * @param {object} [option] Object
     * @param {number} [option.timeout] 超时时间，单位为秒，默认10秒, 0表示不设置超时
     * @returns {Promise<RequestResult>}
     */
    request(method: Method, params?: unknown, option?: { timeout: number }): Promise<WsClient.RequestResult>;

    async request(
        req: Method | Array<{ method: Method, params?: unknown, option?: { timeout: number } }>,
        params?: unknown,
        option?: { timeout: number }) {
        if (Array.isArray(req)) {
            const tasks = req.map(({ method, params, option }) => this._request(method, params, option));

            return await Promise.all(tasks);
        } else {
            return await this._request(req, params, option);
        }
    }

    /**
     * 向服务器发送一次通知
     *
     * @param {Notice} notice 通知名称
     * @param {*} [params]
     * @returns {void}
     */
    notify(notice: Notice, params?: unknown): void;

    /**
     * 向服务器批量发送多个通知
     *
     * @param {Notice} arg.notice 通知名称
     * @param {*} [arg.params]
     * @returns {void}
     * @memberof Client
     */
    notify(arg: Array<{ notice: Notice, params?: unknown }>): void;

    notify(
        notice: Notice | Array<{ notice: Notice, params?: unknown }>,
        params?: unknown,
    ) {
        if (this.status !== WebSocket.OPEN) {
            throw new Error('WebSocket is not open!');
        }
        const notifies = Array.isArray(notice) ? notice : [{ notice, params }];

        for (const { notice, params } of notifies) {
            try {
                this.webSocket.send(JSON.stringify({
                    jsonrpc: '2.0',
                    method: notice,
                    params
                }));
            } catch (e) {
                console.log(e);
            }
        }
    }

    async ping(): Promise<WsClient.RequestResult> {
        return await this.request('ping' as Method);
    }

    async connectInfo(): Promise<WsClient.RequestResult> {
        return await this.request('connect' as Method);
    }

    offline(...args: Array<() => void>): void {
        if (Array.isArray(args) && args.length > 0) {
            for (const fn of args) {
                if (typeof fn === 'function') {
                    this._close.push(fn);
                }
            }
        }
    }

    close() {
        this.webSocket.close();
    }

    /** 原始websocket客户端实例 */
    get client() {
        return this.webSocket;
    }

    get CONNECTING() {
        return 0;
    }

    get OPEN() {
        return 1;
    }

    get CLOSING() {
        return 2;
    }

    get CLOSED() {
        return 3;
    }

    get status() {
        return this.webSocket.readyState;
    }
}

export class JsonRpcIdGenerator {
    private prefix = Math.random().toString(36).substring(2, 6);
    private id = 1;

    public nextId(): string {
        return `${this.prefix}_${this.id++}`;
    }
}
