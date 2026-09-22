import WebSocket, { WebSocketServer as _WebSocketServer, type Server } from 'ws';
import http from 'http';
import { log } from './logger.js';
import { _serverStore, _sessionMap } from './global.js';
import setCore from './core/index.js';
import type { WebSocketService, Logger, Socket, AnyObject } from './typings.js';
import { uuid } from './lib.js';
import { jsonSerialize } from './json.js';


export class WebSocketServer<
    Attr extends AnyObject,
    Method extends string = string,
    OnNoticeMethod extends string = string,
    SendMethod extends string = string
> implements WebSocketService.Server<Attr, Method, OnNoticeMethod, SendMethod> {
    private options: { jsonSerializer: Socket.Link<Attr, SendMethod>['option']['jsonSerializer'], log?: boolean | Socket.Link<Attr, SendMethod>['logger'] } = {
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
            });
            this.server.on('connection', async (socket: Socket.Link<Attr, SendMethod>, request: http.IncomingMessage) => {

                const mount = socket as {
                    option: Socket.Link<Attr, SendMethod>['option'];
                    logger?: Socket.Link<Attr, SendMethod>['logger'];
                    id: string;
                    attribute: Partial<Attr>;
                };

                mount.option = {
                    jsonSerializer: this.options.jsonSerializer
                };
                Object.freeze(mount.option);

                if (this.logger) {
                    mount.logger = this.logger;
                    Object.freeze(mount.logger);
                }


                mount.id = uuid();
                mount.attribute = {};

                const link = socket as unknown as Socket.Link<AnyObject, string>;

                _sessionMap[mount.id] = link;
                setCore(link, this.serverId);

                if (socket.logger) {
                    socket.logger('connection').debug(`socket:${socket.id} is connected!`);
                }

                const onlineFns = _serverStore[this.serverId]?.onlineCallbacks || [];

                if (onlineFns.length > 0) {
                    const cbSocket = socket as unknown as Socket.Link<Partial<AnyObject>, string>;

                    try {
                        for (const fn of onlineFns) {
                            await fn(cbSocket, request);
                        }
                    } catch (error) {
                        if (socket.logger) {
                            const e = error as Error;

                            socket.logger('connection').error(e.stack || e.message);
                        }
                        const errorFns = _serverStore[this.serverId]?.errorCallbacks || [];

                        if (errorFns.length > 0) {
                            for (const fn of errorFns) {
                                await fn(error as Error, cbSocket);
                            }
                        } else {
                            socket.sendout({
                                method: 'connection' as SendMethod,
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
     * @template Params
     * @param {Method} method method名称，不支持ping和connect(已内置)，若传入ping或connect，则忽略
     * @param {WebSocketService.MethodFn<Attr, SendMethod, Params>} cb
     * @memberof WebSocketServer
     */
    register<Params = unknown>(method: Method, cb: WebSocketService.MethodFn<Attr, SendMethod, Params>): void;
    /**
     * 注册一个或多个method
     * method名称不支持ping和connect(已内置)，若传入ping或connect，则忽略
     *
     * @param {Partial<Record<Method, WebSocketService.MethodFn<Attr, SendMethod>>>} method method回调函数
     * @memberof WebSocketServer
     */
    register(method: Partial<Record<Method, WebSocketService.MethodFn<Attr, SendMethod>>>): void;

    register(method: Method | Partial<Record<Method, WebSocketService.MethodFn<Attr, SendMethod>>>, cb?: WebSocketService.MethodFn<Attr, SendMethod>) {
        if (typeof method === 'string' && typeof cb === 'function') {
            if (method === 'ping' || method === 'connect') {
                return;
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            _serverStore[this.serverId]!.methods[method] = cb as unknown as WebSocketService.MethodFn<AnyObject, string>;
        } else if (method && typeof method === 'object' && !Array.isArray(method)) {
            for (const key in method) {
                if (key === 'ping' || key === 'connect') {
                    continue;
                }
                if (key && typeof method[key] === 'function') {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    _serverStore[this.serverId]!.methods[key] = method[key] as unknown as WebSocketService.MethodFn<AnyObject, string>;
                }
            }
        }
    }

    /**
     * 注册适用于所有method的一个或多个中间件
     * 内置的ping和connect不会执行任何中间件
     *
     * @param {...Array<WebSocketService.MiddlewareFn<Attr, SendMethod>>} middlewares
     * @memberof WebSocketServer
     */
    use(middleware: WebSocketService.MiddlewareFn<Attr, SendMethod>, ...middlewares: Array<WebSocketService.MiddlewareFn<Attr, SendMethod>>): void;
    /**
     * 注册只适用于某个method的一个或多个中间件
     * 内置的ping和connect不支持注册中间件
     *
     * @template Params
     * @param {Method} method method名称
     * @param {...Array<WebSocketService.MiddlewareFn<Attr, SendMethod, Params>>} middlewares
     * @memberof WebSocketServer
     */
    use<Params = unknown>(method: Method, ...middlewares: Array<WebSocketService.MiddlewareFn<Attr, SendMethod, Params>>): void;

    use(...middlewares: Array<WebSocketService.MiddlewareFn<Attr, SendMethod>> | [Method, ...Array<WebSocketService.MiddlewareFn<Attr, SendMethod>>]) {
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
                        fn: middleware as unknown as WebSocketService.MiddlewareFn<AnyObject, string>
                    });
                }
            }
        } else if (middlewares.every(m => typeof m === 'function')) {
            _serverStore[this.serverId]?.middlewares.push(
                ...(middlewares as Array<WebSocketService.MiddlewareFn<Attr>>)
                    .map(m => ({
                        type: 'global' as const,
                        fn: m as unknown as WebSocketService.MiddlewareFn<AnyObject, string>
                    }))
            );
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
     *
     * @param notice 消息事件名称，取消息中的method值
     * @param noticeHandlers
     */
    onNotice(notice: OnNoticeMethod, ...noticeHandlers: Array<WebSocketService.NoticeFn<Attr>>): void;

    onNotice(...noticeHandlers: Array<WebSocketService.NoticeFn<Attr>> | [OnNoticeMethod, ...Array<WebSocketService.NoticeFn<Attr>>]) {
        if (typeof noticeHandlers[0] === 'string') {
            const notice = noticeHandlers.shift() as string;

            for (const noticeHandler of noticeHandlers) {
                if (typeof noticeHandler === 'function') {
                    _serverStore[this.serverId]?.noticeHandlers.push({
                        type: 'scoped',
                        notice,
                        fn: noticeHandler as unknown as WebSocketService.NoticeFn<AnyObject>
                    });
                }
            }
        } else if (noticeHandlers.every(n => typeof n === 'function')) {
            _serverStore[this.serverId]?.noticeHandlers.push(
                ...(noticeHandlers as Array<WebSocketService.NoticeFn<Attr>>)
                    .map(n => ({
                        type: 'global' as const,
                        fn: n as unknown as WebSocketService.NoticeFn<AnyObject>
                    }))
            );
        }
    }

    close() {
        if (!this.server) {
            return;
        }
        const server = this.server;

        this.server = null;

        const clients = [...server.clients];

        if (clients.length === 0) {
            server.close();
            delete _serverStore[this.serverId];
            return;
        }

        let remaining = clients.length;

        for (const client of clients) {
            client.once('close', () => {
                if (--remaining === 0) {
                    server.close();
                    delete _serverStore[this.serverId];
                }
            });
            client.terminate();
        }
    }

    online(...args: Array<WebSocketService.OnlineCallbackFn<Attr, SendMethod>>): void {
        if (Array.isArray(args) && args.length > 0) {
            for (const fn of args) {
                if (typeof fn === 'function') {
                    _serverStore[this.serverId]?.onlineCallbacks.push(fn as unknown as WebSocketService.OnlineCallbackFn<AnyObject, string>);
                }
            }
        }
    }

    /**
     * 连接断开后的回调
     *
     * @param {Array<WebSocketService.OfflineCallbackFn<Attr>>} args
     */
    offline(...args: Array<WebSocketService.OfflineCallbackFn<Attr>>): void {
        if (Array.isArray(args) && args.length > 0) {
            for (const fn of args) {
                if (typeof fn === 'function') {
                    _serverStore[this.serverId]?.offlineCallbacks.push(fn as unknown as WebSocketService.OfflineCallbackFn<AnyObject>);
                }
            }
        }
    }

    error<E>(...args: Array<WebSocketService.ErrorCallbackFn<Attr, E, SendMethod>>): void {
        if (Array.isArray(args) && args.length > 0) {
            for (const fn of args) {
                if (typeof fn === 'function') {
                    _serverStore[this.serverId]?.errorCallbacks.push(fn as unknown as WebSocketService.ErrorCallbackFn<AnyObject, unknown, string>);
                }
            }
        }
    }

    getSocket(connectId: string): Socket.Link<Attr, SendMethod> | undefined {
        return _sessionMap[connectId] as Socket.Link<Attr, SendMethod> | undefined;
    }

    getSockets(is: WebSocketService.IsThisSocket<Attr>) {
        const clients: Set<Socket.Link<Attr, SendMethod>> = new Set();

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
        return (this.server?.clients || new Set()) as Set<Socket.Link<Attr, SendMethod>>;
    }

    get methodList() {
        return Object.keys(_serverStore[this.serverId]?.methods || {});
    }

    get port() {
        const addr = this.server?.address();

        return typeof addr === 'object' && addr ? addr.port : undefined;
    }
}
