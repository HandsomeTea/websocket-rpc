import WebSocket from 'ws';
import http from 'http';
import crypto from 'crypto';
import { createLogInstance, log } from './logger';
import setCore from './core';
import { ErrorCallbackFn, Logger, OfflineCallbackFn, OnlineCallbackFn, Options, Socket, WebsocketMethodFn, WebsocketMiddlewareFn, WebsocketService } from './typings';

global._WebsocketServer = {
    sessionMap: {},
    methods: {},
    middlewares: []
};

Object.freeze(global._WebsocketServer);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class WebsocketServer<Attr extends Record<string, any>> implements WebsocketService<Attr> {
    private options: Options = {};
    private configs: WebSocket.ServerOptions = {};
    private server: WebSocket.Server;
    private logger?: ((module?: string) => Logger);
    private _online: Array<OnlineCallbackFn> = [];
    private _offline: Array<OfflineCallbackFn<Attr>> = [];
    private _error: Array<ErrorCallbackFn<Attr>> = [];
    constructor(configs: WebSocket.ServerOptions, options?: Options) {
        if (options?.log) {
            if (typeof options.log === 'function') {
                this.logger = options.log;
            } else {
                createLogInstance();
                this.logger = log;
            }
        }
        if (options?.compression) {
            this.options.compression = options.compression;
        }
        this.configs = configs;
    }

    /**
     * 启动服务
     *
     * @memberof WebsocketServer
     */
    start() {
        this.server = new WebSocket.Server(this.configs);
        this.server.on('error', (error: Error) => {
            if (this.logger) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                this.logger('startup').error(error);
            }
        });
        this.server.on('connection', async (socket: Socket<Attr>, request: http.IncomingMessage) => {
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

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            global._WebsocketServer.sessionMap[socket.connection.id] = socket;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            socket.attribute = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            setCore(socket);

            if (socket.option.logger) {
                socket.option.logger('connection').debug(`socket:${socket.connection.id} is connected!`);
            }

            if (this._online.length > 0) {
                try {
                    for (const fn of this._online) {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        await fn(socket, request);
                    }
                } catch (error) {
                    if (socket.option.logger) {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        socket.option.logger('connection').error(error);
                    }
                }
            }
        });
    }

    /**
     * 注册一个method
     *
     * @param {string} method method名称
     * @param {WebsocketMethodFn<Attr>} cb
     * @memberof WebsocketServer
     */
    register(method: string, cb: WebsocketMethodFn<Attr>): void;
    /**
     * 注册一个或多个method
     *
     * @param {Record<string, WebsocketMethodFn<Attr>>} method method回调函数
     * @memberof WebsocketServer
     */
    register(method: Record<string, WebsocketMethodFn<Attr>>): void;

    register(method: string | Record<string, WebsocketMethodFn<Attr>>, cb?: WebsocketMethodFn<Attr>) {
        if (typeof method === 'string' && typeof cb === 'function') {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            global._WebsocketServer.methods[method] = cb;
        } else if (typeof method !== 'string') {
            Object.assign(global._WebsocketServer.methods, method);
        }
    }

    /**
     * 注册一个或多个适用于所有method的中间件
     *
     * @param {...Array<WebsocketMiddlewareFn<Attr>>} middlewares
     * @memberof WebsocketServer
     */
    use(...middlewares: Array<WebsocketMiddlewareFn<Attr>>): void;
    /**
     * 注册一个或多个只适用于某个method的中间件
     *
     * @param {string} method method名称
     * @param {...Array<WebsocketMiddlewareFn<Attr>>} middlewares
     * @memberof WebsocketServer
     */
    use(method: string, ...middlewares: Array<WebsocketMiddlewareFn<Attr>>): void;

    use(...middlewares: Array<WebsocketMiddlewareFn<Attr>> | [string, ...Array<WebsocketMiddlewareFn<Attr>>]) {
        if (typeof middlewares[0] === 'string') {
            const method = middlewares.shift() as string;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            global._WebsocketServer.middlewares.push(...(middlewares as Array<WebsocketMiddlewareFn<Attr>>).map(m => ({ [method]: m })));
        } else if (middlewares.every(m => typeof m === 'function')) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            global._WebsocketServer.middlewares.push(...middlewares as Array<WebsocketMiddlewareFn<Attr>>);
        }
    }

    /**
     * 停止服务
     *
     * @memberof WebsocketService
     */
    close() {
        this.server.close();
    }

    /**
     * 新连接构建成功后的回调
     *
     * @param {...Array<OnlineCallbackFn>} args
     * @memberof WebsocketServer
     */
    online(...args: Array<OnlineCallbackFn>): void {
        this._online.push(...args);
    }

    /**
     * 连接断开后的回调
     *
     * @param {...Array<OfflineCallbackFn<Attr>>} args
     * @memberof WebsocketServer
     */
    offline(...args: Array<OfflineCallbackFn<Attr>>): void {
        this._offline.push(...args);
    }

    /**
     * middleware或method运行出错时的错误处理
     * 注意：只处理middleware和method执行抛出的错误
     * @param {...Array<ErrorCallbackFn<Attr>>} args
     * @memberof WebsocketServer
     */
    error(...args: Array<ErrorCallbackFn<Attr>>): void {
        this._error.push(...args);
    }

    /**
     * 根据socket的连接id获取socket对象
     *
     * @param {string} connectId
     * @returns
     * @memberof WebsocketServer
     */
    getClient(connectId: string): Socket<Attr> | undefined {
        return global._WebsocketServer.sessionMap[connectId] as Socket<Attr> | undefined;
    }

    /**
     * 根据socket连接的属性数据获取socket对象
     *
     * @param {(attribute: Attr) => boolean} is
     * @returns
     * @memberof WebsocketServer
     */
    getClients(is: (attribute: Attr) => boolean) {
        const clients: Set<Socket<Attr>> = new Set();

        for (const socket of this.clients) {
            const attr = socket.attribute;

            if (is(attr) === true) {
                clients.add(socket);
            }
        }
        return clients;
    }

    /**
     * 获取某个socket连接的全部属性
     *
     * @param {string} connectId
     * @returns {(Attr | undefined)}
     * @memberof WebsocketServer
     */
    getAttr(connectId: string): Attr | undefined;
    /**
     * 获取某个socket连接指定的属性
     *
     * @param {string} connectId
     * @param {Partial<keyof Attr>} attribute
     * @returns {*}
     * @memberof WebsocketServer
     */
    getAttr<K extends Partial<keyof Attr>>(connectId: string, attribute: K): Attr[K] | undefined;

    getAttr<K extends Partial<keyof Attr>>(connectId: string, attribute?: K) {
        if (global._WebsocketServer.sessionMap[connectId]) {
            const data = global._WebsocketServer.sessionMap[connectId].attribute;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return attribute ? data[attribute] : data;
        }
        return undefined;
    }

    /**
     * 设置socket连接的属性
     *
     * @param {string} connectId
     * @param {Partial<Attr>} attribute
     * @memberof WebsocketServer
     */
    setAttr(connectId: string, attribute: Partial<Attr>) {
        if (global._WebsocketServer.sessionMap[connectId]) {
            Object.assign(global._WebsocketServer.sessionMap[connectId].attribute, attribute);
        }
    }

    /**
     * 所有socket连接
     *
     * @readonly
     * @memberof WebsocketServer
     */
    get clients() {
        return this.server.clients as unknown as Set<Socket<Attr>>;
    }

    /**
     * 所有定义的method名称
     *
     * @readonly
     * @memberof WebsocketServer
     */
    get methodList() {
        return Object.keys(global._WebsocketServer.methods);
    }
}
