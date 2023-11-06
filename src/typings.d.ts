import WebSocket from 'ws';

/**global变量 */
declare global {
    var _WebsocketServer: {
        sessionMap: Record<string, Socket>;
        methods: Record<string, WebsocketMethodFn>;
        middlewares: Array<WebsocketMiddlewareFn | Record<string, WebsocketMiddlewareFn>>;
    }
}

declare interface Logger {
    trace(message: string): void;
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

declare interface Options {
    log?: boolean | ((module?: string) => Logger)
    compression?: 'zlib'
}

declare interface MethodResult {
    jsonrpc: '2.0'
    id: string | number
    method: string
    result?: unknown
    error?: {
        /** 应为-32000到-32099之间的数字 */
        code: number
        message: string
        data?: unknown
    }
}

declare type Socket = WebSocket & {
    attempt: Record<string, any>
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
    sendout: (message: Omit<MethodResult, 'jsonrpc'>) => void
}

declare type WebsocketMiddlewareFn = (params: unknown, socket: Socket, method: string) => Record<string, any> | undefined | Promise<Record<string, any> | undefined>
declare type WebsocketMethodFn = (params: unknown, socket: Socket) => unknown | Promise<unknown>;
declare type OnlineCallbackFn = (socket: Socket, request: http.IncomingMessage) => void;
declare type OfflineCallbackFn = (attempt: Socket['attempt'], connection: Socket['connection']) => void;
declare type ErrorCallbackFn = (error: Error, socket: Socket) => void;

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
