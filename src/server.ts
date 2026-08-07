import WebSocket, { WebSocketServer, type Server } from 'ws';
import http from 'http';
import crypto from 'crypto';
import { log } from './logger.js';
import { _serverStore, _sessionMap } from './global.js';
import setCore from './core/index.js';
import type { WebsocketService, Logger, Socket, AnyObject } from './typings.js';
import { uuid } from './lib.js';


export class WebsocketServer<Attr extends AnyObject, M extends string = string> implements WebsocketService.Server<Attr, M> {
    private options: Socket.Link<Attr>['option'] = {
        RPCSerializer: {
            serialize: (data) => JSON.stringify(data, null, '   '),
            deserialize: JSON.parse
        }
    };
    private configs: WebSocket.ServerOptions = {};
    private server!: Server;
    private serverId: string = crypto.randomBytes(16).toString('hex');
    private logger?: ((module?: string) => Logger);

    constructor(configs: WebSocket.ServerOptions, options?: WebsocketService.Options) {
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
        if (options?.RPCSerializer?.deserialize && typeof options.RPCSerializer.deserialize === 'function') {
            this.options.RPCSerializer.deserialize = options.RPCSerializer.deserialize;
        }
        if (options?.RPCSerializer?.serialize && typeof options.RPCSerializer.serialize === 'function') {
            this.options.RPCSerializer.serialize = options.RPCSerializer.serialize;
        }
        this.configs = configs;
        _serverStore[this.serverId] = {
            methods: {},
            middlewares: [],
            noticeHandlers: [],
            onlineCallbacks: [],
            offlineCallbacks: [],
            errorCallbacks: [],
            requestIds: {}
        };

        Object.freeze(_serverStore[this.serverId]);
    }

    start(cb?: () => void) {
        this.server = new WebSocketServer(this.configs);
        this.server.on('error', (error: Error) => {
            if (this.logger) {
                this.logger('startup').error(error.stack || error.message);
            }
        });
        this.server.on('connection', async (socket: Socket.Link<Attr>, request: http.IncomingMessage) => {

            // @ts-ignore
            socket.option = {
                RPCSerializer: this.options.RPCSerializer
            };
            if (this.logger) {
                socket.option.logger = this.logger;
            }
            if (this.options.compression) {
                socket.option.compression = this.options.compression;
            }
            Object.freeze(socket.option);


            // @ts-ignore
            socket.id = crypto.randomBytes(24).toString('hex').substring(0, 16);
            // @ts-ignore
            _sessionMap[socket.id] = socket;


            // @ts-ignore
            socket.attribute = {};

            // @ts-ignore
            setCore(socket, this.serverId);

            if (socket.option.logger) {
                socket.option.logger('connection').debug(`socket:${socket.id} is connected!`);
            }

            const onlineFns = _serverStore[this.serverId]?.onlineCallbacks || [];

            if (onlineFns.length > 0) {
                try {
                    for (const fn of onlineFns) {
                        // @ts-ignore
                        await fn(socket, request);
                    }
                } catch (error) {
                    if (socket.option.logger) {
                        const e = error as Error;

                        socket.option.logger('connection').error(e.stack || e.message);
                    }
                    const errorFns = _serverStore[this.serverId]?.errorCallbacks || [];

                    if (errorFns.length > 0) {
                        for (const fn of errorFns) {

                            // @ts-ignore
                            await fn(error as Error, socket);
                        }
                    } else {
                        socket.sendout({
                            id: uuid(),
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

        if (typeof cb === 'function') {
            cb();
        }
    }

    /**
     * 注册一个method
     *
     * @param {M} method method名称
     * @param {WebsocketService.MethodFn<Attr>} cb
     * @memberof WebsocketServer
     */
    register(method: M, cb: WebsocketService.MethodFn<Attr>): void;
    /**
     * 注册一个或多个method
     *
     * @param {Record<M, WebsocketService.MethodFn<Attr>>} method method回调函数
     * @memberof WebsocketServer
     */
    register(method: Record<M, WebsocketService.MethodFn<Attr>>): void;

    register(method: M | Record<M, WebsocketService.MethodFn<Attr>>, cb?: WebsocketService.MethodFn<Attr>) {
        if (typeof method === 'string' && typeof cb === 'function') {
            // @ts-ignore
            _serverStore[this.serverId].methods[method] = cb;
        } else if (method && typeof method === 'object' && !Array.isArray(method)) {
            for (const key in method) {
                if (key && typeof method[key] === 'function') {
                    // @ts-ignore
                    _serverStore[this.serverId].methods[key] = method[key];
                }
            }
        }
    }

    /**
     * 注册适用于所有method的一个或多个中间件
     *
     * @param {...Array<WebsocketService.MiddlewareFn<Attr>>} middlewares
     * @memberof WebsocketServer
     */
    use(middleware: WebsocketService.MiddlewareFn<Attr>, ...middlewares: Array<WebsocketService.MiddlewareFn<Attr>>): void;
    /**
     * 注册只适用于某个method的一个或多个中间件
     *
     * @param {M} method method名称
     * @param {...Array<WebsocketService.MiddlewareFn<Attr>>} middlewares
     * @memberof WebsocketServer
     */
    use(method: M, ...middlewares: Array<WebsocketService.MiddlewareFn<Attr>>): void;

    use(...middlewares: Array<WebsocketService.MiddlewareFn<Attr>> | [M, ...Array<WebsocketService.MiddlewareFn<Attr>>]) {
        if (typeof middlewares[0] === 'string') {
            const method = middlewares.shift() as string;

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
            _serverStore[this.serverId].middlewares.push(...(middlewares as Array<WebsocketService.MiddlewareFn<Attr>>).map(m => ({ type: 'global', fn: m })));
        }
    }

    /**
     * 注册一个或多个针对所有notice消息的监听事件
     * @param noticeHandler
     * @param noticeHandlers
     */
    onNotice(noticeHandler: WebsocketService.NoticeFn<Attr>, ...noticeHandlers: Array<WebsocketService.NoticeFn<Attr>>): void;
    /**
     * 注册一个或多个只适用于某个notice消息的监听事件
     * @param notice 消息事件名称，取消息中的method值
     * @param noticeHandlers
     */
    onNotice<N extends string = string>(notice: N, ...noticeHandlers: Array<WebsocketService.NoticeFn<Attr>>): void;

    onNotice(...noticeHandlers: Array<WebsocketService.NoticeFn<Attr>> | [string, ...Array<WebsocketService.NoticeFn<Attr>>]) {
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
            _serverStore[this.serverId].noticeHandlers.push(...(noticeHandlers as Array<WebsocketService.NoticeFn<Attr>>).map(n => ({ type: 'global', fn: n })));
        }
    }

    close() {
        this.server.close();
    }

    online(...args: Array<WebsocketService.OnlineCallbackFn<Attr>>): void {
        if (Array.isArray(args) && args.length > 0) {
            for (const fn of args) {
                if (typeof fn === 'function') {
                    // @ts-ignore
                    _serverStore[this.serverId]?.onlineCallbacks.push(fn);
                }
            }
        }
    }

    offline(...args: Array<WebsocketService.OfflineCallbackFn<Attr>>): void {
        if (Array.isArray(args) && args.length > 0) {
            for (const fn of args) {
                if (typeof fn === 'function') {
                    // @ts-ignore
                    _serverStore[this.serverId]?.offlineCallbacks.push(fn);
                }
            }
        }
    }

    error<E>(...args: Array<WebsocketService.ErrorCallbackFn<Attr, E>>): void {
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

    getSockets(is: WebsocketService.IsThisSocket<Attr>) {
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
     * @memberof WebsocketServer
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
    * @memberof WebsocketServer
    */
    getSocketAttr<K extends keyof Attr>(connectId: string, attribute: K): Attr[K] | undefined;
    /**
     * 获取某个socket连接的某些属性
     *
     * @template K
     * @param {string} connectId
     * @param {...Array<K>} attributes
     * @returns {(Pick<Attr, Array<K>[number]> | undefined)}
     * @memberof WebsocketServer
     */
    getSocketAttr<K extends keyof Attr>(connectId: string, ...attributes: Array<K>): Pick<Attr, Array<K>[number]> | undefined

    getSocketAttr<K extends keyof Attr>(connectId: string, ...attribute: Array<K>) {
        if (_sessionMap[connectId]) {

            // @ts-ignore
            return _sessionMap[connectId].getAttr(...attribute);
        }
        return undefined;
    }

    /**
     * 获取某些socket连接的全部属性
     *
     * @param {WebsocketService.IsThisSocket<Attr>} is
     * @returns {Array<Attr>}
     * @memberof WebsocketServer
     */
    getSocketsAttr(is: WebsocketService.IsThisSocket<Attr>): Array<Attr>;
    /**
     * 获取某些socket连接的某个属性
     *
     * @template K
     * @param {WebsocketService.IsThisSocket<Attr>} is
     * @param {K} attribute
     * @returns {Array<Attr[K]>}
     * @memberof WebsocketServer
     */
    getSocketsAttr<K extends keyof Attr>(is: WebsocketService.IsThisSocket<Attr>, attribute: K): Array<Attr[K]>;
    /**
     * 获取某些socket连接的某些属性
     *
     * @template K
     * @param {WebsocketService.IsThisSocket<Attr>} is
     * @param {...Array<K>} attributes
     * @returns {Array<Pick<Attr, Array<K>[number]>>}
     * @memberof WebsocketServer
     */
    getSocketsAttr<K extends keyof Attr>(is: WebsocketService.IsThisSocket<Attr>, ...attributes: Array<K>): Array<Pick<Attr, Array<K>[number]>>;

    getSocketsAttr<K extends keyof Attr>(is: WebsocketService.IsThisSocket<Attr>, ...attribute: Array<K>) {
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
        return this.server.clients as Set<Socket.Link<Attr>>;
    }

    get methodList() {
        return Object.keys(_serverStore[this.serverId]?.methods || {});
    }
}
