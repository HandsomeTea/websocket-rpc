import WebSocket, { WebSocketServer as _WebSocketServer, type Server } from 'ws';
import http from 'http';
import { log } from './logger.js';
import { _serverStore, _sessionMap } from './global.js';
import setCore from './core/index.js';
import type { WebSocketService, Logger, Socket, AnyObject } from './typings.js';
import { uuid } from './lib.js';
import { jsonSerialize } from './json.js';


export class WebSocketServer<Attr extends AnyObject, Method extends string = string, Notice extends string = string> implements WebSocketService.Server<Attr, Method, Notice> {
    private options: { jsonSerializer: Socket.Link<Attr>['option']['jsonSerializer'], log?: boolean | Socket.Link<Attr>['logger'] } = {
        jsonSerializer: {
            serialize: jsonSerialize,
            deserialize: JSON.parse
        }
    };
    private configs: WebSocket.ServerOptions = {};
    private server: Server | null = null;
    private serverId: string = uuid();
    private logger?: ((module?: string) => Logger);

    constructor(configs: WebSocket.ServerOptions, options?: WebSocketService.Options) {
        if (options?.log) {
            if (typeof options.log === 'function') {
                this.logger = options.log;
            } else {
                this.logger = log;
            }
        }
        if (options?.jsonSerializer?.deserialize && typeof options.jsonSerializer.deserialize === 'function') {
            this.options.jsonSerializer.deserialize = options.jsonSerializer.deserialize;
        }
        if (options?.jsonSerializer?.serialize && typeof options.jsonSerializer.serialize === 'function') {
            this.options.jsonSerializer.serialize = options.jsonSerializer.serialize;
        }
        this.configs = configs;
        _serverStore[this.serverId] = {
            methods: {},
            middlewares: [],
            noticeHandlers: [],
            onlineCallbacks: [],
            offlineCallbacks: [],
            errorCallbacks: [],
            requestIds: new Map()
        };

        Object.freeze(_serverStore[this.serverId]);
    }

    async start() {
        if (this.server) {
            return;
        }
        if (this.configs.noServer) {
            this.server = new _WebSocketServer(this.configs);
            return;
        }
        await new Promise((resolve, reject) => {
            this.server = new _WebSocketServer(this.configs);
            this.server.on('error', (error: Error) => {
                if (this.logger) {
                    this.logger('startup').error(error.stack || error.message);
                }
                reject(error);
            });
            this.server.on('listening', () => {
                resolve(true);
            })
            this.server.on('close', () => {
                // delete _serverStore[this.serverId];
            });
            this.server.on('connection', async (socket: Socket.Link<Attr>, request: http.IncomingMessage) => {

                // @ts-ignore
                socket.option = {
                    jsonSerializer: this.options.jsonSerializer
                };
                Object.freeze(socket.option);

                if (this.logger) {
                    // @ts-ignore
                    socket.logger = this.logger;
                    Object.freeze(socket.logger);
                }


                // @ts-ignore
                socket.id = uuid();
                // @ts-ignore
                _sessionMap[socket.id] = socket;


                // @ts-ignore
                socket.attribute = {};

                // @ts-ignore
                setCore(socket, this.serverId);

                if (socket.logger) {
                    socket.logger('connection').debug(`socket:${socket.id} is connected!`);
                }

                const onlineFns = _serverStore[this.serverId]?.onlineCallbacks || [];

                if (onlineFns.length > 0) {
                    try {
                        for (const fn of onlineFns) {
                            // @ts-ignore
                            await fn(socket, request);
                        }
                    } catch (error) {
                        if (socket.logger) {
                            const e = error as Error;

                            socket.logger('connection').error(e.stack || e.message);
                        }
                        const errorFns = _serverStore[this.serverId]?.errorCallbacks || [];

                        if (errorFns.length > 0) {
                            for (const fn of errorFns) {

                                // @ts-ignore
                                await fn(error as Error, socket);
                            }
                        } else {
                            socket.sendout({
                                method: 'connection',
                                error: {
                                    code: -32603,
                                    message: 'Internal error',
                                    data: 'Internal error'
                                }
                            });
                        }
                    }
                }
            });
        });
    }

    /**
     * 注册一个method
     *
     * @param {Method} method method名称，不支持ping和connect(已内置)，若传入ping或connect，则忽略
     * @param {WebSocketService.MethodFn<Attr>} cb
     * @memberof WebSocketServer
     */
    register(method: Method, cb: WebSocketService.MethodFn<Attr>): void;
    /**
     * 注册一个或多个method
     * method名称不支持ping和connect(已内置)，若传入ping或connect，则忽略
     *
     * @param {Record<Method, WebSocketService.MethodFn<Attr>>} method method回调函数
     * @memberof WebSocketServer
     */
    register(method: Record<Method, WebSocketService.MethodFn<Attr>>): void;

    register(method: Method | Record<Method, WebSocketService.MethodFn<Attr>>, cb?: WebSocketService.MethodFn<Attr>) {
        if (typeof method === 'string' && typeof cb === 'function') {
            if (method === 'ping' || method === 'connect') {
                return;
            }
            // @ts-ignore
            _serverStore[this.serverId].methods[method] = cb;
        } else if (method && typeof method === 'object' && !Array.isArray(method)) {
            for (const key in method) {
                if (key === 'ping' || key === 'connect') {
                    continue;
                }
                if (key && typeof method[key] === 'function') {
                    // @ts-ignore
                    _serverStore[this.serverId].methods[key] = method[key];
                }
            }
        }
    }

    /**
     * 注册适用于所有method的一个或多个中间件
     * 内置的ping和connect不会执行任何中间件
     *
     * @param {...Array<WebSocketService.MiddlewareFn<Attr>>} middlewares
     * @memberof WebSocketServer
     */
    use(middleware: WebSocketService.MiddlewareFn<Attr>, ...middlewares: Array<WebSocketService.MiddlewareFn<Attr>>): void;
    /**
     * 注册只适用于某个method的一个或多个中间件
     * 内置的ping和connect不支持注册中间件
     *
     * @param {Method} method method名称
     * @param {...Array<WebSocketService.MiddlewareFn<Attr>>} middlewares
     * @memberof WebSocketServer
     */
    use(method: Method, ...middlewares: Array<WebSocketService.MiddlewareFn<Attr>>): void;

    use(...middlewares: Array<WebSocketService.MiddlewareFn<Attr>> | [Method, ...Array<WebSocketService.MiddlewareFn<Attr>>]) {
        if (typeof middlewares[0] === 'string') {
            const method = middlewares.shift() as string;

            if (method === 'ping' || method === 'connect') {
                return;
            }
            for (const middleware of middlewares) {
                if (typeof middleware === 'function') {
                    _serverStore[this.serverId]?.middlewares.push({
                        type: 'scoped',
                        method,
                        // @ts-ignore
                        fn: middleware
                    });
                }
            }
        } else if (middlewares.every(m => typeof m === 'function')) {
            // @ts-ignore
            _serverStore[this.serverId].middlewares.push(...(middlewares as Array<WebSocketService.MiddlewareFn<Attr>>).map(m => ({ type: 'global', fn: m })));
        }
    }

    /**
     * 注册一个或多个针对所有notice消息的监听事件
     * @param noticeHandler
     * @param noticeHandlers
     */
    onNotice(noticeHandler: WebSocketService.NoticeFn<Attr>, ...noticeHandlers: Array<WebSocketService.NoticeFn<Attr>>): void;
    /**
     * 注册一个或多个只适用于某个notice消息的监听事件
     * @param notice 消息事件名称，取消息中的method值
     * @param noticeHandlers
     */
    onNotice(notice: Notice, ...noticeHandlers: Array<WebSocketService.NoticeFn<Attr>>): void;

    onNotice(...noticeHandlers: Array<WebSocketService.NoticeFn<Attr>> | [Notice, ...Array<WebSocketService.NoticeFn<Attr>>]) {
        if (typeof noticeHandlers[0] === 'string') {
            const notice = noticeHandlers.shift() as string;

            for (const noticeHandler of noticeHandlers) {
                if (typeof noticeHandler === 'function') {
                    _serverStore[this.serverId]?.noticeHandlers.push({
                        type: 'scoped',
                        notice,
                        // @ts-ignore
                        fn: noticeHandler
                    });
                }
            }
        } else if (noticeHandlers.every(n => typeof n === 'function')) {
            // @ts-ignore
            _serverStore[this.serverId].noticeHandlers.push(...(noticeHandlers as Array<WebSocketService.NoticeFn<Attr>>).map(n => ({ type: 'global', fn: n })));
        }
    }

    close() {
        this.server?.close();
        this.server = null;
    }

    online(...args: Array<WebSocketService.OnlineCallbackFn<Attr>>): void {
        if (Array.isArray(args) && args.length > 0) {
            for (const fn of args) {
                if (typeof fn === 'function') {
                    // @ts-ignore
                    _serverStore[this.serverId]?.onlineCallbacks.push(fn);
                }
            }
        }
    }

    /**
     * 连接断开后的回调
     * @param {Array<WebSocketService.OfflineCallbackFn<Attr>>} args
     */
    offline(...args: Array<WebSocketService.OfflineCallbackFn<Attr>>): void {
        if (Array.isArray(args) && args.length > 0) {
            for (const fn of args) {
                if (typeof fn === 'function') {
                    // @ts-ignore
                    _serverStore[this.serverId]?.offlineCallbacks.push(fn);
                }
            }
        }
    }

    error<E>(...args: Array<WebSocketService.ErrorCallbackFn<Attr, E>>): void {
        if (Array.isArray(args) && args.length > 0) {
            for (const fn of args) {
                if (typeof fn === 'function') {
                    // @ts-ignore
                    _serverStore[this.serverId]?.errorCallbacks.push(fn);
                }
            }
        }
    }

    getSocket(connectId: string): Socket.Link<Attr> | undefined {
        return _sessionMap[connectId] as Socket.Link<Attr> | undefined;
    }

    getSockets(is: WebSocketService.IsThisSocket<Attr>) {
        const clients: Set<Socket.Link<Attr>> = new Set();

        if (typeof is === 'function') {
            for (const socket of this.clients) {
                const attr = socket.attribute;

                if (is(attr) === true) {
                    clients.add(socket);
                }
            }
        }

        return clients;
    }

    /**
     * 获取某个socket连接的全部属性
     *
     * @param {string} connectId
     * @returns {(Attr | undefined)}
     * @memberof WebSocketServer
     */
    // @ts-ignore
    getSocketAttr(connectId: string): Attr | undefined;
    /**
    * 获取某个socket连接的某个属性
    *
    * @template K
    * @param {string} connectId
    * @param {K} attribute
    * @returns {(Attr[K] | undefined)}
    * @memberof WebSocketServer
    */
    getSocketAttr<K extends keyof Attr>(connectId: string, attribute: K): Attr[K] | undefined;
    /**
     * 获取某个socket连接的某些属性
     *
     * @template K
     * @param {string} connectId
     * @param {...Array<K>} attributes
     * @returns {(Pick<Attr, Array<K>[number]> | undefined)}
     * @memberof WebSocketServer
     */
    getSocketAttr<K extends keyof Attr>(connectId: string, ...attributes: Array<K>): Pick<Attr, Array<K>[number]> | undefined

    getSocketAttr<K extends keyof Attr>(connectId: string, ...attribute: Array<K>) {
        if (_sessionMap[connectId]) {

            // @ts-ignore
            return _sessionMap[connectId].getAttr(...attribute);
        }
    }

    /**
     * 获取某些socket连接的全部属性
     *
     * @param {WebSocketService.IsThisSocket<Attr>} is
     * @returns {Array<Attr>}
     * @memberof WebSocketServer
     */
    getSocketsAttr(is: WebSocketService.IsThisSocket<Attr>): Array<Attr>;
    /**
     * 获取某些socket连接的某个属性
     *
     * @template K
     * @param {WebSocketService.IsThisSocket<Attr>} is
     * @param {K} attribute
     * @returns {Array<Attr[K]>}
     * @memberof WebSocketServer
     */
    getSocketsAttr<K extends keyof Attr>(is: WebSocketService.IsThisSocket<Attr>, attribute: K): Array<Attr[K]>;
    /**
     * 获取某些socket连接的某些属性
     *
     * @template K
     * @param {WebSocketService.IsThisSocket<Attr>} is
     * @param {...Array<K>} attributes
     * @returns {Array<Pick<Attr, Array<K>[number]>>}
     * @memberof WebSocketServer
     */
    getSocketsAttr<K extends keyof Attr>(is: WebSocketService.IsThisSocket<Attr>, ...attributes: Array<K>): Array<Pick<Attr, Array<K>[number]>>;

    getSocketsAttr<K extends keyof Attr>(is: WebSocketService.IsThisSocket<Attr>, ...attribute: Array<K>) {
        const result = [];

        if (typeof is === 'function') {
            for (const socket of this.clients) {
                const attr = socket.attribute;

                if (is(attr) === true) {
                    if (attribute.length === 0) {
                        result.push(attr);
                    } else if (attribute.length === 1 && typeof attribute[0] === 'string') {
                        result.push(attr[attribute[0]]);
                    } else if (attribute.length > 1 && attribute.every(key => typeof key === 'string')) {
                        result.push(Object.assign({}, ...attribute.map(key => ({ [key]: attr[key] }))));
                    }
                }
            }
        }

        return result;
    }

    setSocketAttr(connectId: string, attribute: Partial<Attr>) {
        if (_sessionMap[connectId]) {
            _sessionMap[connectId].setAttr(attribute);
        }
    }

    get clients() {
        return (this.server?.clients || new Set()) as Set<Socket.Link<Attr>>;
    }

    get methodList() {
        return Object.keys(_serverStore[this.serverId]?.methods || {});
    }

    get port() {
        const addr = this.server?.address();

        return typeof addr === 'object' && addr ? addr.port : undefined;
    }
}
