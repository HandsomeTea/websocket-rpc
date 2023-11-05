import WebSocket from 'ws';
import http from 'http';
import crypto from 'crypto';
import { log } from './logger';
import setCore from './core';

interface Logger {
    trace(message: string): void;
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    fatal(message: string): void;
}

interface Options {
    log?: boolean | ((module?: string) => Logger)
    compression?: 'zlib'
}

export interface MethodResult {
    jsonrpc: '2.0'
    id: string | number
    method: string
    result?: unknown
    error?: {
        code: number
        message: string
        data?: unknown
    }
}

export type Socket = WebSocket & {
    attempt: Record<string, unknown>
    connection: {
        id: string
        ip?: string
    }
    option: {
        logger?: (module?: string) => Logger
        compression?: 'zlib'
    }
    offline?: (attempt: Socket['attempt'], connection: Socket['connection']) => void;
    error?: (error: Error, socket: Socket) => void;
    sendout: (message: MethodResult, action?: string) => void
}

export type WebsocketMiddlewareFn = (params: unknown, socket: Socket, method: string) => Record<string, unknown> | undefined | Promise<Record<string, unknown> | undefined>
export type WebsocketMethodFn = (params: unknown, socket: Socket) => unknown | Promise<unknown>;
export type OnlineCallbackFn = (socket: Socket, request: http.IncomingMessage) => void;
export type OfflineCallbackFn = (attempt: Socket['attempt'], connection: Socket['connection']) => void;
export type ErrorCallbackFn = (error: Error, socket: Socket) => void;

global._WebsocketServer = {
    sessionMap: {},
    methods: {},
    middlewares: []
};

Object.freeze(global._WebsocketServer);

declare class WebsocketService {
    constructor(configs: WebSocket.ServerOptions, options?: Options);

    /**
     * 注册中间件,适用于所有method
     *
     * @param {...Array<WebsocketMiddlewareFn>} middlewares 中间件
     * @memberof WebsocketService
     */
    use(...middlewares: Array<WebsocketMiddlewareFn>): void;

    /**
     * 注册中间件，适用于某个method
     *
     * @param {string} method 中间件作用的method
     * @param {...Array<WebsocketMiddlewareFn>} middlewares 中间件
     * @memberof WebsocketService
     */
    use(method: string, ...middlewares: Array<WebsocketMiddlewareFn>): void;

    /**
     * 通过method名称注册一个method
     *
     * @param {string} method method名称
     * @param {WebsocketMethodFn} cb 方法
     * @memberof WebsocketService
     */
    register(method: string, cb: WebsocketMethodFn): void;

    /**
     * 注册多个method
     *
     * @param {Record<string, WebsocketMethodFn>} method method的定义
     * @memberof WebsocketService
     */
    register(method: Record<string, WebsocketMethodFn>): void;

    /**
     * 启动服务
     *
     * @memberof WebsocketService
     */
    start(): void;

    /**
     * 停止服务
     *
     * @memberof WebsocketService
     */
    close(): void;

    /**
     * 有新的连接构建时的回调
     *
     * @param {OnlineCallbackFn} cb
     * @memberof WebsocketService
     */
    online(cb: OnlineCallbackFn): void;

    /**
     * 连接断开时的回调
     *
     * @param {OfflineCallbackFn} cb
     * @memberof WebsocketService
     */
    offline(cb: OfflineCallbackFn): void;

    error(cb: ErrorCallbackFn): void;
}
export class WebsocketServer implements WebsocketService {
    private options: Options = {};
    private configs: WebSocket.ServerOptions = {};
    private server: WebSocket.Server;
    private logger?: ((module?: string) => Logger);
    private _online?: OnlineCallbackFn;
    private _offline?: OfflineCallbackFn;
    private _error?: ErrorCallbackFn;
    constructor(configs: WebSocket.ServerOptions, options?: Options) {
        if (options?.log) {
            if (typeof options.log === 'function') {
                this.logger = options.log;
            } else {
                this.logger = log;
            }
        }
        if (options?.compression) {
            this.options.compression = options.compression;
        }
        this.configs = configs;
    }

    start() {
        this.server = new WebSocket.Server(this.configs);
        this.server.on('error', (error: Error) => {
            if (this.logger) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                this.logger('startup').error(error);
            }
        });
        this.server.on('connection', (socket: Socket, request: http.IncomingMessage) => {
            if (this._offline) {
                socket.offline = this._offline;
            }
            if (this._error) {
                socket.error = this._error;
            }
            socket.option = {};
            if (this.logger) {
                socket.option.logger = this.logger;
            }
            if (this.options.compression) {
                socket.option.compression = this.options.compression;
            }
            Object.freeze(socket.option);

            socket.connection = {
                id: crypto.randomBytes(24).toString('hex').substring(0, 16),
                ip: request.headers['x-forwarded-for']?.toString().split(',')[0].trim() || request.socket.remoteAddress
            };
            Object.freeze(socket.connection);

            global._WebsocketServer.sessionMap[socket.connection.id] = socket;

            socket.attempt = {};
            setCore(socket);

            if (socket.option.logger) {
                socket.option.logger('connection').debug(`socket:${socket.connection.id} is connected!`);
            }

            if (this._online) {
                this._online(socket, request);
            }
            // Object.freeze(global._WebsocketServer.methods);
            // Object.freeze(global._WebsocketServer.middlewares);
        });
    }

    register(method: string | Record<string, WebsocketMethodFn>, cb?: WebsocketMethodFn) {
        if (typeof method === 'string' && typeof cb === 'function') {
            global._WebsocketServer.methods[method] = cb;
        } else if (typeof method !== 'string') {
            Object.assign(global._WebsocketServer.methods, method);
        }
    }

    use(...middlewares: Array<WebsocketMiddlewareFn> | [string, ...Array<WebsocketMiddlewareFn>]) {
        if (typeof middlewares[0] === 'string') {
            const method = middlewares.shift() as string;

            global._WebsocketServer.middlewares.push(...(middlewares as Array<WebsocketMiddlewareFn>).map(m => ({ [method]: m })));
        } else if (middlewares.every(m => typeof m === 'function')) {
            global._WebsocketServer.middlewares.push(...middlewares as Array<WebsocketMiddlewareFn>);
        }
    }
    close() {
        this.server.close();
    }

    online(cb: OnlineCallbackFn): void {
        this._online = cb;
    }

    offline(cb: OfflineCallbackFn): void {
        this._offline = cb;
    }

    error(cb: ErrorCallbackFn): void {
        this._error = cb;
    }

    // get sockets() {
    //     return this.server.clients as Set<Socket>;
    // }

    // getSocket(connectId: string) {
    //     return global._WebsocketServer.sessionMap[connectId];
    // }

    // setClientAttr(connectId: string, attribute: Record<string, unknown>) {
    //     global._WebsocketServer.sessionMap[connectId].attempt = {
    //         ...global._WebsocketServer.sessionMap[connectId].attempt,
    //         ...attribute
    //     };
    // }

    // getClientAttr(connectId: string, attribute?: string) {
    //     const data = global._WebsocketServer.sessionMap[connectId].attempt;

    //     return attribute ? data[attribute] : data;
    // }

    get methodList() {
        return Object.keys(global._WebsocketServer.methods);
    }

    get middlewareList() {
        return global._WebsocketServer.middlewares;
    }
}
