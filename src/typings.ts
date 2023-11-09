/* eslint-disable @typescript-eslint/no-explicit-any */
import WebSocket from 'ws';
import http from 'http';

export interface Logger {
    trace(message: string): void;
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

export interface Options {
    log?: boolean | ((module?: string) => Logger)
    compression?: 'zlib'
}

export interface MethodResult {
    jsonrpc: '2.0'
    id: string | number
    /** 非jsonrpc2.0标准字段。
     * 用于标记结果所属的method时，可取请求数据的method值；也可自定义取值，标记服务器自定义推送信息
     */
    method?: string
    result?: unknown
    error?: {
        /** 应为-32768至-32000之间的数字 */
        code: number
        message: string
        data?: unknown
    }
}

type AnyObject = Record<string, any>;

export interface Socket<T extends AnyObject> extends WebSocket {
    attribute: T
    id: string
    option: {
        logger?: (module?: string) => Logger
        compression?: 'zlib'
    }
    offline: Array<(attribute: T, id: string) => void | Promise<void>>;
    error: Array<(error: Error, socket: Socket<Partial<T>>, method?: string) => void | Promise<void>>;
    sendout: (message: Omit<MethodResult, 'jsonrpc'>) => void
    setAttr: <K extends keyof T>(attribute: K | Partial<T>, value?: T[K]) => void;
    getAttr: <K extends keyof T>(attribute?: K) => T | T[K] | undefined;
}

export type WebsocketMiddlewareFn<Attribute extends AnyObject> = (params: unknown, socket: Socket<Partial<Attribute>>, method: string) => Partial<Attribute> | undefined | Promise<Partial<Attribute> | undefined>
export type WebsocketMethodFn<Attribute extends AnyObject> = (params: unknown, socket: Socket<Attribute>) => any | Promise<any>;
export type OnlineCallbackFn = (socket: Socket<NonNullable<unknown>>, request: http.IncomingMessage) => void | Promise<void>;
export type OfflineCallbackFn<Attribute extends AnyObject> = (attribute: Attribute, id: string) => void | Promise<void>;
export type ErrorCallbackFn<Attribute extends AnyObject> = (error: Error, socket: Socket<Partial<Attribute>>, method?: string) => void | Promise<void>;

export interface WebsocketService<Attribute extends AnyObject> {
    // new(configs: WebSocket.ServerOptions, options?: Options): void;

    use(...middlewares: Array<WebsocketMiddlewareFn<Attribute>> | [string, ...Array<WebsocketMiddlewareFn<Attribute>>]): void;

    register(method: string | Record<string, WebsocketMethodFn<Attribute>>, cb?: WebsocketMethodFn<Attribute>): void;

    start(): void;

    close(): void;

    online(...args: Array<OnlineCallbackFn>): void;

    offline(...args: Array<OfflineCallbackFn<Attribute>>): void;

    error(...args: Array<ErrorCallbackFn<Attribute>>): void;

    getSocket(connectId: string): Socket<Attribute> | undefined;

    getSockets(is: (attribute: Attribute) => boolean): Set<Socket<Attribute>>;

    getSocketAttr<K extends keyof Attribute>(connectId: string, attribute?: K): Attribute | Attribute[K] | undefined;

    setSocketAttr(connectId: string, attribute: Partial<Attribute>): void;

    readonly clients: Set<Socket<Attribute>>;

    readonly methodList: Array<string>;
}
