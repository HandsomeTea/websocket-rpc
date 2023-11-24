/* eslint-disable @typescript-eslint/no-explicit-any */
import WebSocket from 'ws';
import http from 'http';

// export interface Logger {
//     trace(message: string): void;
//     debug(message: string): void;
//     info(message: string): void;
//     warn(message: string): void;
//     error(message: string): void;
// }

// export interface Options {
//     log?: boolean | ((module?: string) => Logger)
//     compression?: 'zlib'
// }

// export interface MethodResult {
//     jsonrpc: '2.0'
//     id: string | number
//     /** 非jsonrpc2.0标准字段。
//      * 用于标记结果所属的method时，可取请求数据的method值；也可自定义取值，标记服务器自定义推送信息
//      */
//     method?: string
//     result?: unknown
//     error?: {
//         /** 应为-32768至-32000之间的数字 */
//         code: number
//         message: string
//         data?: unknown
//     }
// }

// type AnyObject = Record<string, any>;

// interface SetAttr<T extends AnyObject> {
//     /** 为socket设置attribute属性，值为value */
//     <K extends keyof T>(attribute: K, value: T[K]): void;
//     /** 将attribute的键值设置到socket的属性中 */
//     (attribute: Partial<T>): void;
// }

// interface GetAttr<T extends AnyObject> {
//     /** 获取socket的attribute属性 */
//     <K extends keyof T>(attribute: K): T[K];
//     /** 获取socket的全部属性 */
//     (): T;
// }

// export interface Socket<T extends AnyObject> extends WebSocket {
//     attribute: T
//     id: string
//     option: {
//         logger?: (module?: string) => Logger
//         compression?: 'zlib'
//     }
//     offline: Array<(attribute: T, id: string) => void | Promise<void>>;
//     error: Array<(error: Error, socket: Socket<Partial<T>>, method?: string) => void | Promise<void>>;
//     sendout: (message: Omit<MethodResult, 'jsonrpc'>) => void
//     setAttr: SetAttr<T>;
//     getAttr: GetAttr<T>;
// }

// export type WebsocketMiddlewareFn<Attribute extends AnyObject> = (params: unknown, socket: Socket<Partial<Attribute>>, method: string) => Partial<Attribute> | undefined | Promise<Partial<Attribute> | undefined>
// export type WebsocketMethodFn<Attribute extends AnyObject> = (params: unknown, socket: Socket<Attribute>) => any | Promise<any>;
// export type OnlineCallbackFn = (socket: Socket<NonNullable<unknown>>, request: http.IncomingMessage) => void | Promise<void>;
// export type OfflineCallbackFn<Attribute extends AnyObject> = (attribute: Attribute, id: string) => void | Promise<void>;
// export type ErrorCallbackFn<Attribute extends AnyObject> = (error: Error, socket: Socket<Partial<Attribute>>, method?: string) => void | Promise<void>;

// export interface WebsocketService<Attribute extends AnyObject> {
//     // new(configs: WebSocket.ServerOptions, options?: Options): void;

//     use(...middlewares: Array<WebsocketMiddlewareFn<Attribute>> | [string, ...Array<WebsocketMiddlewareFn<Attribute>>]): void;

//     register(method: string | Record<string, WebsocketMethodFn<Attribute>>, cb?: WebsocketMethodFn<Attribute>): void;

//     start(): void;

//     close(): void;

//     online(...args: Array<OnlineCallbackFn>): void;

//     offline(...args: Array<OfflineCallbackFn<Attribute>>): void;

//     error(...args: Array<ErrorCallbackFn<Attribute>>): void;

//     getSocket(connectId: string): Socket<Attribute> | undefined;

//     getSockets(is: (attribute: Attribute) => boolean): Set<Socket<Attribute>>;

//     getSocketAttr<K extends keyof Attribute>(connectId: string, attribute?: K): Attribute | Attribute[K] | undefined;

//     setSocketAttr(connectId: string, attribute: Partial<Attribute>): void;

//     readonly clients: Set<Socket<Attribute>>;

//     readonly methodList: Array<string>;
// }


export interface Logger {
    trace(message: string): void;
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Socket {

    type AnyObject = Record<string, any>;

    interface SetAttr<T extends AnyObject> {
        /** 为socket设置key为attribute属性，值为value */
        <K extends keyof T>(attribute: K, value: T[K]): void;

        /** 将attribute的键值设置到socket的属性中 */
        (attribute: Partial<T>): void;
    }

    interface GetAttr<T extends AnyObject> {
        /** 获取socket的某个属性 */
        <K extends keyof T>(attribute: K): T[K] | undefined;

        /** 获取某些属性 */
        <K extends keyof T>(attribute: K, ...attributes: Array<K>): { [S in K]: T[S] };

        /** 获取socket的全部属性 */
        (): T;
    }

    export interface MethodResult {
        jsonrpc: '2.0'
        id: string | number
        /**
         * 非jsonrpc2.0标准字段。
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

    export interface Link<T extends AnyObject> extends WebSocket {
        readonly attribute: T
        readonly id: string
        readonly option: {
            logger?: (module?: string) => Logger
            compression?: 'zlib'
        }
        // eslint-disable-next-line no-use-before-define
        readonly offline: Array<WebsocketService.OfflineCallbackFn<T>>;
        // eslint-disable-next-line no-use-before-define
        readonly error: Array<WebsocketService.ErrorCallbackFn<T>>;

        /**
         * 发送符合jsonrpc2.0规范的数据
         *
         * @param {Omit<MethodResult, 'jsonrpc'>} message
         * @memberof Link
         */
        readonly sendout: (message: Omit<MethodResult, 'jsonrpc'>) => void;

        readonly setAttr: SetAttr<T>;
        readonly getAttr: GetAttr<T>;
    }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace WebsocketService {

    export interface Options {
        log?: boolean | ((module?: string) => Logger)
        compression?: 'zlib'
    }

    type AnyObject = Record<string, any>;

    export type MiddlewareFn<Attribute extends AnyObject> = (params: unknown, socket: Socket.Link<Partial<Attribute>>, method: string) => Partial<Attribute> | void | Promise<Partial<Attribute> | void>
    export type MethodFn<Attribute extends AnyObject> = (params: unknown, socket: Socket.Link<Attribute>) => any | Promise<any>;
    export type OnlineCallbackFn = (socket: Socket.Link<NonNullable<unknown>>, request: http.IncomingMessage) => void | Promise<void>;
    export type OfflineCallbackFn<Attribute extends AnyObject> = (attribute: Attribute, id: string) => void | Promise<void>;
    export type ErrorCallbackFn<Attribute extends AnyObject> = (error: Error, socket: Socket.Link<Partial<Attribute>>, method?: string) => void | Promise<void>;

    interface Use<Attribute extends AnyObject> {
        /** 注册适用于所有method的一个或多个中间件 */
        (middleware: MiddlewareFn<Attribute>, ...middlewares: Array<MiddlewareFn<Attribute>>): void;

        /** 注册只适用于某个method的一个或多个中间件 */
        (method: string, ...middlewares: Array<MiddlewareFn<Attribute>>): void;
    }

    interface Register<Attribute extends AnyObject> {
        /** 注册一个method */
        (method: string, cb: MethodFn<Attribute>): void;

        /** 注册一个或多个method */
        (method: Record<string, MethodFn<Attribute>>): void;
    }

    export type IsThisSocket<Attr> = (attribute: Attr) => boolean;

    interface GetSocketAttr<Attribute extends AnyObject> {
        /** 获取某个socket连接的全部属性 */
        (connectId: string): Attribute | undefined;

        /** 获取某个socket连接的某个属性 */
        <K extends keyof Attribute>(connectId: string, attribute: K): Attribute[K] | undefined;

        /** 获取某个socket连接的某些属性 */
        <K extends keyof Attribute>(connectId: string, ...attributes: Array<K>): Pick<Attribute, Array<K>[number]> | undefined;
    }

    interface GetSocketsAttr<Attribute extends AnyObject> {
        /** 获取某些socket连接的全部属性 */
        (is: IsThisSocket<Attribute>): Array<Attribute>;

        /** 获取某些socket连接的某个属性 */
        <K extends keyof Attribute>(is: IsThisSocket<Attribute>, attribute: K): Array<Attribute[K]>;

        /** 获取某些socket连接的某些属性 */
        <K extends keyof Attribute>(is: IsThisSocket<Attribute>, ...attributes: Array<K>): Array<Pick<Attribute, Array<K>[number]>>;
    }

    export interface Server<Attribute extends AnyObject> {
        readonly use: Use<Attribute>;
        readonly register: Register<Attribute>;

        /**
         * 启动服务
         *
         * @memberof Server
         */
        readonly start: () => void;

        /**
         * 停止服务
         *
         * @memberof Server
         */
        readonly close: () => void;

        /**
         * 新连接构建成功后的回调
         *
         * @param {...Array<OnlineCallbackFn>} args
         * @memberof Server
         */
        readonly online: (...args: Array<OnlineCallbackFn>) => void;

        /**
         * 连接断开后的回调
         *
         * @param {...Array<OfflineCallbackFn<Attribute>>} args
         * @memberof Server
         */
        readonly offline: (...args: Array<OfflineCallbackFn<Attribute>>) => void;

        /**
         * middleware或method运行出错时的错误处理。
         * 注意：只处理middleware和method执行抛出的错误
         *
         * @param {...Array<ErrorCallbackFn<Attribute>>} args
         * @memberof Server
         */
        readonly error: (...args: Array<ErrorCallbackFn<Attribute>>) => void;

        /**
         * 根据socket的连接id获取socket对象
         *
         * @param {string} connectId
         * @returns {(Socket.Link<Attribute> | undefined)}
         * @memberof Server
         */
        readonly getSocket: (connectId: string) => Socket.Link<Attribute> | undefined;

        /**
         * 根据socket连接的属性数据获取socket对象
         *
         * @param {IsThisSocket<Attribute>} is
         * @returns {Set<Socket.Link<Attribute>>}
         * @memberof Server
         */
        readonly getSockets: (is: IsThisSocket<Attribute>) => Set<Socket.Link<Attribute>>;

        readonly getSocketAttr: GetSocketAttr<Attribute>;

        readonly getSocketsAttr: GetSocketsAttr<Attribute>;

        /**
         * 设置socket连接的属性
         *
         * @param {string} connectId
         * @param {Partial<Attribute>} attribute
         * @memberof Server
         */
        readonly setSocketAttr: (connectId: string, attribute: Partial<Attribute>) => void;

        /**
         * 所有socket连接
         *
         * @type {Set<Socket.Link<Attribute>>}
         * @memberof Server
         */
        readonly clients: Set<Socket.Link<Attribute>>;

        /**
         * 所有定义的method名称
         *
         * @type {Array<string>}
         * @memberof Server
         */
        readonly methodList: Array<string>;
    }
}
