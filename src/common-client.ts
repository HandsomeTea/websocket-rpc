import { jsonSerialize } from './json.js';
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

    protected options = {
        timeout: CLIENT_DEFAULT_TIMEOUT,
        jsonSerializer: {
            serialize: jsonSerialize,
            deserialize: JSON.parse
        },
        perMessageHandler: undefined as WsClient.Options['perMessageHandler']
    };

    protected record: Record<string, { result: Socket.ServerMessage['result'], error: Socket.ServerMessage['error'] }> = {};

    protected _close: Array<() => void> = [];

    protected listeners: Record<string, Set<WsClient.ListeningCallbackFn>> = {};

    private onceListenerMap: Record<string, WeakMap<WsClient.ListeningCallbackFn, WsClient.ListeningCallbackFn>> = {};

    private idGenerator = new JsonRPCIdGenerator();

    protected init(options?: WsClient.Options) {
        if (options) {
            if (typeof options.timeout === 'number' && !isNaN(options.timeout) && options.timeout >= 0) {
                this.options.timeout = options.timeout;
            }
            if (options.perMessageHandler && typeof options.perMessageHandler === 'function') {
                this.options.perMessageHandler = options.perMessageHandler;
            }
            if (options.jsonSerializer?.serialize && typeof options.jsonSerializer.serialize === 'function') {
                this.options.jsonSerializer.serialize = options.jsonSerializer.serialize;
            }
            if (options.jsonSerializer?.deserialize && typeof options.jsonSerializer.deserialize === 'function') {
                this.options.jsonSerializer.deserialize = options.jsonSerializer.deserialize;
            }
        }
    }

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
            if (data.error || data.result) {
                fn(data.error, data.result);
            } else {
                fn(data as unknown as Socket.ServerMessage['error'], undefined);
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async messageHandler(data: any): Promise<void> {
        let res: Socket.ServerMessage | null = null;

        try {
            let _data = data;

            if (this.options.perMessageHandler) {
                _data = await this.options.perMessageHandler(data);
            } else {
                _data = data.toString();
            }
            res = this.options.jsonSerializer.deserialize(_data) as Socket.ServerMessage;
        } catch (e) {
            console.log(e, data);
            return;
        }

        const cacheId = this.getRecordKey(res.id, res.method);

        if (cacheId && this.record[cacheId]) {
            if (res.error) {
                this.record[cacheId].error = res.error;
            } else {
                this.record[cacheId].result = res.result;
            }
        } else if (res.method) { // 服务端的notify
            this.emit(res.method, res);
        } else { // 未知消息
            this.emit('unknownMsg', res);
        }
    }

    listening(method: string, callback: WsClient.ListeningCallbackFn): void {
        if (!this.listeners[method]) {
            this.listeners[method] = new Set();
        }
        this.listeners[method].add(callback);
    }

    listeningOnce(method: string, callback: WsClient.ListeningCallbackFn): void {
        if (!this.listeners[method]) {
            this.listeners[method] = new Set();
        }
        const wrapper: typeof callback = (...args: Parameters<typeof callback>) => {
            this.removeListening(method, callback);
            callback(...args);
        };

        if (!this.onceListenerMap[method]) {
            this.onceListenerMap[method] = new WeakMap();
        }
        this.onceListenerMap[method].set(callback, wrapper);
        this.listeners[method].add(wrapper);
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
     *
     * @param {Method} method method名称
     * @param {*} [params]
     * @param {object} [option] Object
     * @param {number} [option.timeout] 超时时间，单位为秒，默认10秒, 0表示不设置超时
     * @returns {Promise<RequestResult>}
     */
    async request(method: Method, params?: unknown, option?: { timeout: number }): Promise<WsClient.RequestResult> {
        if (this.status !== WebSocket.OPEN) {
            throw new Error('WebSocket is not open!');
        }
        if (!method) {
            throw new Error('method name is required!');
        }
        const id = this.idGenerator.id();
        const cacheId = this.getRecordKey(id, method) as string;
        const self = this;
        const { timeout } = option || {};

        try {
            return await new Promise((resolve, reject) => {
                this.record[cacheId] = new class Cache {
                    private timer: number | null = null;
                    constructor() {
                        const _self = this;
                        let _timeout = -1;

                        if (typeof timeout === 'number' && !isNaN(timeout) && timeout >= 0) {
                            _timeout = timeout;
                        } else if (typeof self.options.timeout === 'number' && !isNaN(self.options.timeout) && self.options.timeout >= 0) {
                            _timeout = self.options.timeout;
                        } else {
                            _timeout = CLIENT_DEFAULT_TIMEOUT;
                        }

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
                            self.webSocket.send(self.options.jsonSerializer.serialize({
                                jsonrpc: '2.0',
                                id,
                                method,
                                params
                            }));
                        } catch (e) {
                            console.log(e);

                            _self.error = {
                                code: -32001,
                                message: 'Parse error',
                                data: 'Parse error'
                            }
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
    async batch(arg: Array<{ method: Method, params?: unknown, option?: { timeout: number } }>) {
        if (!Array.isArray(arg)) {
            throw new Error('batch argument[arg] must be an array!');
        }
        if (arg.find(req => !req.method)) {
            throw new Error('batch argument[arg] must be an array of objects with method property!')
        }
        const tasks = arg.map(({ method, params, option }) => this.request(method, params, option));

        return await Promise.all(tasks);
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
                this.webSocket.send(this.options.jsonSerializer.serialize({
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
        if (this.webSocket) {
            return this.webSocket.readyState;
        }
        return this.CLOSED;
    }
}

/**
 * jsonrpc id生成器，适用于客户端/服务端
 * - example:
 * ```
 *      const idGenerator = new JsonRPCIdGenerator();
 * ```
 * - then you can use it to generate id:
 * ```
 *      const id = idGenerator.id();
 * ```
 * @class JsonRPCIdGenerator
 */
export class JsonRPCIdGenerator {
    private prefix = Math.random().toString(36).substring(2, 6);
    private _id = 1;

    /**
     * 生成jsonrpc id
     * @returns {string}
     */
    public id(): string {
        return `${this.prefix}_${this._id++}`;
    }
}
