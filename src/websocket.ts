import WebSocket from 'ws';
import http from 'http';
import crypto from 'crypto';
import { createLogInstance, log } from './logger';
import setCore from './core';
import { WebsocketService, Logger, Socket } from './typings';

global._WebsocketServer = {
    sessionMap: {},
    methods: {},
    middlewares: []
};

Object.freeze(global._WebsocketServer);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class WebsocketServer<Attr extends Record<string, any>> implements WebsocketService.Server<Attr> {
    private options: WebsocketService.Options = {};
    private configs: WebSocket.ServerOptions = {};
    private server: WebSocket.Server;
    private logger?: ((module?: string) => Logger);
    private _online: Array<WebsocketService.OnlineCallbackFn> = [];
    private _offline: Array<WebsocketService.OfflineCallbackFn<Attr>> = [];
    private _error: Array<WebsocketService.ErrorCallbackFn<Attr>> = [];
    constructor(configs: WebSocket.ServerOptions, options?: WebsocketService.Options) {
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

    start() {
        this.server = new WebSocket.Server(this.configs);
        this.server.on('error', (error: Error) => {
            if (this.logger) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                this.logger('startup').error(error);
            }
        });
        this.server.on('connection', async (socket: Socket.Link<Attr>, request: http.IncomingMessage) => {
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

            socket.id = crypto.randomBytes(24).toString('hex').substring(0, 16);

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            global._WebsocketServer.sessionMap[socket.id] = socket;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            socket.attribute = {};
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            setCore(socket);

            if (socket.option.logger) {
                socket.option.logger('connection').debug(`socket:${socket.id} is connected!`);
            }

            if (this._online.length > 0) {
                // try {
                for (const fn of this._online) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    await fn(socket, request);
                }
                // } catch (error) {
                //     if (socket.option.logger) {
                //         // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //         // @ts-ignore
                //         socket.option.logger('connection').error(error);
                //     }
                // }
            }
        });
    }

    /**
     * 注册一个method
     *
     * @param {string} method method名称
     * @param {WebsocketService.WebsocketMethodFn<Attr>} cb
     * @memberof WebsocketServer
     */
    register(method: string, cb: WebsocketService.WebsocketMethodFn<Attr>): void;
    /**
     * 注册一个或多个method
     *
     * @param {Record<string, WebsocketService.WebsocketMethodFn<Attr>>} method method回调函数
     * @memberof WebsocketServer
     */
    register(method: Record<string, WebsocketService.WebsocketMethodFn<Attr>>): void;

    register(method: string | Record<string, WebsocketService.WebsocketMethodFn<Attr>>, cb?: WebsocketService.WebsocketMethodFn<Attr>) {
        if (typeof method === 'string' && typeof cb === 'function') {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            global._WebsocketServer.methods[method] = cb;
        } else if (typeof method === 'object' && !Array.isArray(method)) {
            for (const key in method) {
                if (key && typeof method[key] === 'function') {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    global._WebsocketServer.methods[key] = method[key];
                }
            }
        }
    }

    /**
     * 注册一个或多个适用于所有method的中间件
     *
     * @param {...Array<WebsocketService.WebsocketMiddlewareFn<Attr>>} middlewares
     * @memberof WebsocketServer
     */
    use(...middlewares: Array<WebsocketService.WebsocketMiddlewareFn<Attr>>): void;
    /**
     * 注册一个或多个只适用于某个method的中间件
     *
     * @param {string} method method名称
     * @param {...Array<WebsocketService.WebsocketMiddlewareFn<Attr>>} middlewares
     * @memberof WebsocketServer
     */
    use(method: string, ...middlewares: Array<WebsocketService.WebsocketMiddlewareFn<Attr>>): void;

    use(...middlewares: Array<WebsocketService.WebsocketMiddlewareFn<Attr>> | [string, ...Array<WebsocketService.WebsocketMiddlewareFn<Attr>>]) {
        if (typeof middlewares[0] === 'string') {
            const method = middlewares.shift() as string;

            for (const middleware of middlewares) {
                if (typeof middleware === 'function') {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    global._WebsocketServer.middlewares.push({ [method]: middleware });
                }
            }
        } else if (middlewares.every(m => typeof m === 'function')) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            global._WebsocketServer.middlewares.push(...middlewares as Array<WebsocketService.WebsocketMiddlewareFn<Attr>>);
        }
    }

    close() {
        this.server.close();
    }

    online(...args: Array<WebsocketService.OnlineCallbackFn>): void {
        if (Array.isArray(args) && args.length > 0) {
            for (const fn of args) {
                if (typeof fn === 'function') {
                    this._online.push(fn);
                }
            }
        }
    }

    offline(...args: Array<WebsocketService.OfflineCallbackFn<Attr>>): void {
        if (Array.isArray(args) && args.length > 0) {
            for (const fn of args) {
                if (typeof fn === 'function') {
                    this._offline.push(fn);
                }
            }
        }
    }

    error(...args: Array<WebsocketService.ErrorCallbackFn<Attr>>): void {
        if (Array.isArray(args) && args.length > 0) {
            for (const fn of args) {
                if (typeof fn === 'function') {
                    this._error.push(fn);
                }
            }
        }
    }

    getSocket(connectId: string): Socket.Link<Attr> | undefined {
        return global._WebsocketServer.sessionMap[connectId] as Socket.Link<Attr> | undefined;
    }

    getSockets(is: (attribute: Attr) => boolean) {
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
    getSocketAttr(connectId: string): Attr | undefined;
    /**
     * 获取某个socket连接指定的属性
     *
     * @param {string} connectId
     * @param {keyof Attr} attribute
     * @returns {*}
     * @memberof WebsocketServer
     */
    getSocketAttr<K extends keyof Attr>(connectId: string, attribute: K): Attr[K] | undefined;

    getSocketAttr<K extends keyof Attr>(connectId: string, attribute?: K) {
        if (global._WebsocketServer.sessionMap[connectId]) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return global._WebsocketServer.sessionMap[connectId].getAttr(attribute);
        }
        return undefined;
    }

    setSocketAttr(connectId: string, attribute: Partial<Attr>) {
        if (global._WebsocketServer.sessionMap[connectId]) {
            global._WebsocketServer.sessionMap[connectId].setAttr(attribute);
        }
    }

    get clients() {
        return this.server.clients as unknown as Set<Socket.Link<Attr>>;
    }

    get methodList() {
        return Object.keys(global._WebsocketServer.methods);
    }
}
