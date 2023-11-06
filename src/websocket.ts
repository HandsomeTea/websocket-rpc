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

    get clients() {
        return this.server.clients as unknown as Set<Socket>;
    }

    getClient(connectId: string) {
        return global._WebsocketServer.sessionMap[connectId];
    }

    getClientsByAttr(options: Record<string, boolean | string | number> & Partial<{ connectId: string }>) {
        const clients: Set<Socket> = new Set();

        if (options.connectId) {
            const socket = this.getClient(options.connectId);

            if (socket) {
                clients.add(socket);
            }
            return clients;
        }

        for (const socket of this.clients) {
            const attr = socket.attempt;
            let is = true;

            for (const key in options) {
                if (attr[key] !== options[key]) {
                    is = false;
                    break;
                }
            }
            if (is) {
                clients.add(socket);
            }
        }
        return clients;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setClientAttr(connectId: string, attribute: Record<string, any>) {
        if (global._WebsocketServer.sessionMap[connectId]) {
            global._WebsocketServer.sessionMap[connectId].attempt = {
                ...global._WebsocketServer.sessionMap[connectId].attempt,
                ...attribute
            };
        }
    }

    getClientAttr(connectId: string, attribute?: string) {
        if (global._WebsocketServer.sessionMap[connectId]) {
            const data = global._WebsocketServer.sessionMap[connectId].attempt;

            return attribute ? data[attribute] : data;
        }
        return null;
    }

    get methodList() {
        return Object.keys(global._WebsocketServer.methods);
    }

    get middlewareList() {
        return global._WebsocketServer.middlewares;
    }
}
