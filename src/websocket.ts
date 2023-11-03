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
    sendByCompress: (message: MethodResult, action: string) => void
}

export type WebsocketMiddlewareFn = (params: unknown, socket: Socket, method: string) => Record<string, unknown> | undefined | Promise<Record<string, unknown> | undefined>
export type WebsocketMethodFn = (params: unknown, socket: Socket) => unknown | Promise<unknown>;

global._WebsocketServer = {
    sessionMap: {},
    methods: {},
    middlewares: []
};

Object.freeze(global._WebsocketServer);
export class WebsocketServer extends WebSocket.Server {
    private _options: Options = {};
    constructor(options: WebSocket.ServerOptions & Options) {
        super(options);
        if (options.log) {
            this._options.log = typeof options.log === 'function' ? options.log : Boolean(options.log);
        }
        if (options.compression) {
            this._options.compression = options.compression;
        }
    }

    receive(cb?: (socket: Socket, request: http.IncomingMessage) => void) {
        return this.on('connection', (_socket: Socket, request: http.IncomingMessage) => {
            _socket.connection = {
                id: crypto.randomBytes(24).toString('hex').substring(0, 16),
                ip: request.headers['x-forwarded-for']?.toString().split(',')[0].trim() || request.socket.remoteAddress
            };
            Object.freeze(_socket.connection);
            global._WebsocketServer.sessionMap[_socket.connection.id] = _socket;

            _socket.option = {};
            if (this._options.log) {
                if (this._options.log === true) {
                    _socket.option.logger = log;
                } else {
                    _socket.option.logger = this._options.log;
                }
            }
            if (this._options.compression) {
                _socket.option.compression = this._options.compression;
            }
            Object.freeze(_socket.option);

            _socket.attempt = {};
            setCore(_socket);

            if (_socket.option.logger) {
                _socket.option.logger('connection').debug(`socket:${_socket.connection.id} is connected!`);
            }

            if (cb) {
                cb(_socket, request);
            }
            // Object.freeze(global._WebsocketServer.methods);
            // Object.freeze(global._WebsocketServer.middlewares);
        });
    }

    method(method: string | Record<string, WebsocketMethodFn>, cb?: WebsocketMethodFn) {
        if (typeof method === 'string' && typeof cb === 'function') {
            global._WebsocketServer.methods[method] = cb;
        } else if (typeof method !== 'string') {
            Object.assign(global._WebsocketServer.methods, method);
        }
    }

    middleware(...middlewares: Array<WebsocketMiddlewareFn> | [string, ...Array<WebsocketMiddlewareFn>]) {
        if (typeof middlewares[0] === 'string') {
            const method = middlewares.shift() as string;

            global._WebsocketServer.middlewares.push(...(middlewares as Array<WebsocketMiddlewareFn>).map(m => ({ [method]: m })));
        } else if (middlewares.every(m => typeof m === 'function')) {
            global._WebsocketServer.middlewares.push(...middlewares as Array<WebsocketMiddlewareFn>);
        }
    }

    getClient(connectId: string) {
        return global._WebsocketServer.sessionMap[connectId];
    }

    setClientAttr(connectId: string, attribute: Record<string, unknown>) {
        global._WebsocketServer.sessionMap[connectId].attempt = {
            ...global._WebsocketServer.sessionMap[connectId].attempt,
            ...attribute
        };
    }

    getClientAttr(connectId: string, attribute?: string) {
        const data = global._WebsocketServer.sessionMap[connectId].attempt;

        return attribute ? data[attribute] : data;
    }

    get methodList() {
        return Object.keys(global._WebsocketServer.methods);
    }

    get middlewareList() {
        return global._WebsocketServer.middlewares;
    }
}
