import type WebSocket from 'ws';
import type http from 'http';
export interface Logger {
	trace(message: string): void;
	debug(message: string): void;
	info(message: string): void;
	warn(message: string): void;
	error(message: string): void;
}

type BaseType = string | number | boolean | null;

export interface AnyObject {
	[key: string]: BaseType | Array<BaseType> | AnyObject | Array<AnyObject>;
}

export declare namespace Socket {

	interface SetAttr<Attr extends AnyObject> {
		/** 将attribute的键值设置到socket的属性中 */
		(attribute: Partial<Attr>): void;

		/** 为socket设置key为attribute属性，值为value */
		<K extends keyof Attr>(attribute: K, value: Attr[K]): void;
	}

	interface GetAttr<Attr extends AnyObject> {
		/** 获取socket的全部属性 */
		(): Attr;

		/** 获取socket的某个属性 */
		<K extends keyof Attr>(attribute: K): Attr[K] | undefined;

		/** 获取某些属性 */
		<K extends keyof Attr>(attribute: K, ...attributes: Array<K>): { [Key in K]: Attr[Key] };
	}

	export interface MethodRequest {
		jsonrpc: '2.0'
		/** 一般为随机字符串或，uuid为佳 */
		id?: string | number | null
		method: string
		params?: unknown
	}

	export interface ServerMessage {
		jsonrpc: '2.0'
		/** 一般为随机字符串或，uuid为佳 */
		id: string | number | null
		/**
		 * 非jsonrpc2.0标准字段。
		 * 用于标记结果所属的method时，可取请求数据的method值；也可自定义取值，标记服务器自定义推送信息
		 * 不可以为unknownMsg，以unknownMsg为名的method是客户端监听位置消息的固定method
		 */
		method?: string
		result?: unknown
		error?: WebSocketService.RPCError
	}

	export interface Link<Attr extends AnyObject> extends WebSocket {
		/** 连接的全部属性 */
		readonly attribute: Attr
		/** 连接的id */
		readonly id: string
		readonly logger?: (module?: string) => Logger

		readonly option: {
			jsonSerializer: {
				serialize: (data: unknown) => string
				deserialize: (data: string) => unknown
			}
		}

		/**
		 * 发送符合jsonrpc2.0规范的数据
		 *
		 * @param {Omit<ServerMessage, 'jsonrpc'>} message
		 * @memberof Link
		 */
		readonly sendout: (message: Omit<ServerMessage, 'jsonrpc'>) => Promise<void>;

		readonly setAttr: SetAttr<Attr>;
		readonly getAttr: GetAttr<Attr>;
	}
}


export declare namespace WebSocketService {

	export interface Options {
		log?: boolean | ((module?: string) => Logger)
		jsonSerializer?: {
			/** 序列化方法，默认为JSON.stringify */
			serialize?: (data: unknown) => string
			/** 反序列化方法，默认为JSON.parse */
			deserialize?: (data: string) => unknown
		}
	}

	export interface RPCError {
		/** -32768至-32000的数字 */
		code: number
		message: string
		data?: unknown
		stack?: string
	}

	/** 中间件阶段Attribute可能未完全获取到 */
	// @ts-ignore
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	export type MiddlewareFn<Attribute extends AnyObject> = (params: unknown, socket: Socket.Link<Partial<Attribute>>, method: string) => Partial<Attribute> | void | Promise<Partial<Attribute> | void>
	export type MethodFn<Attribute extends AnyObject> = (params: unknown, socket: Socket.Link<Attribute>) => unknown | Promise<unknown>;
	export type NoticeFn<Attribute extends AnyObject> = (params: unknown, attribute: Attribute, notice: string) => void | Promise<void>;
	/** online阶段Attribute几乎未获取到 */
	// @ts-ignore
	export type OnlineCallbackFn<Attribute extends AnyObject> = (socket: Socket.Link<Partial<Attribute>>, request: http.IncomingMessage) => void | Promise<void>;
	export type OfflineCallbackFn<Attribute extends AnyObject> = (attribute: Attribute, id: string) => void | Promise<void>;
	/** 中间件阶段可能触发错误回调，Attribute可能未完全获取到 */
	// @ts-ignore
	export type ErrorCallbackFn<Attribute extends AnyObject, E> = (error: E, socket: Socket.Link<Partial<Attribute>>, reqData?: Socket.MethodRequest) => void | Promise<void>;

	interface Use<Attribute extends AnyObject, Method extends string = string> {
		/**
		 * 注册适用于所有method的一个或多个中间件
		 * 内置的ping和connect不会执行任何中间件
		*/
		(middleware: MiddlewareFn<Attribute>, ...middlewares: Array<MiddlewareFn<Attribute>>): void;

		/**
		 * 注册只适用于某个method的一个或多个中间件
		 * 内置的ping和connect不支持注册中间件
		*/
		(method: Method, ...middlewares: Array<MiddlewareFn<Attribute>>): void;
	}

	interface Register<Attribute extends AnyObject, Method extends string = string> {
		/**
		 * 注册一个method
		 * @param {Method} method method名称，不支持ping和connect(已内置)，若传入ping或connect，则忽略
		 */
		(method: Method, cb: MethodFn<Attribute>): void;

		/**
		 * 注册一个或多个method
		 * method名称不支持ping和connect(已内置)，若传入ping或connect，则忽略
		 */
		(method: Record<Method, MethodFn<Attribute>>): void;
	}

	interface OnNotice<Attribute extends AnyObject, Notice extends string = string> {
		/** 注册一个或多个针对所有notice消息的监听事件 */
		(noticeHandler: NoticeFn<Attribute>, ...noticeHandlers: Array<NoticeFn<Attribute>>): void;

		/** 注册一个或多个只适用于某个notice消息的监听事件 */
		(notice: Notice, ...noticeHandlers: Array<NoticeFn<Attribute>>): void;
	}

	export type IsThisSocket<Attr> = (attribute: Attr) => boolean | undefined;

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

	export interface Server<Attribute extends AnyObject, Method extends string = string, Notice extends string = string> {
		readonly use: Use<Attribute, Method>;
		readonly register: Register<Attribute, Method>;
		readonly onNotice: OnNotice<Attribute, Notice>;

		/**
		 * 启动服务
		 *
		 * @memberof Server
		 */
		readonly start: () => Promise<void>;

		/**
		 * 停止服务
		 *
		 * @memberof Server
		 */
		readonly close: () => void;

		/**
		 * 新连接构建成功后的回调
		 *
		 * @param {...Array<OnlineCallbackFn<Attribute>>} args
		 * @memberof Server
		 */
		readonly online: (...args: Array<OnlineCallbackFn<Attribute>>) => void;

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
		 * @template E
		 * @param {...Array<WebSocketService.ErrorCallbackFn<Attribute, E>>} args
		 * @memberof Server
		 */
		readonly error: <E>(...args: Array<ErrorCallbackFn<Attribute, E>>) => void;

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

		readonly port: number | undefined;
	}
}


export declare namespace WsClient {

	export interface Options {
		/**
		 * 接收method返回超时时间，单位为秒，默认10秒
		 * 设置为0表示不设置超时
		 */
		timeout?: number;
	}

	export type ListeningCallbackFn = (error: Socket.ServerMessage['error'] | null, result: Socket.ServerMessage['result']) => void;
	export type RequestResult = { error?: Socket.ServerMessage['error'], result?: Socket.ServerMessage['result'] };

	interface Request<Method extends string = string> {
		/**
		 * 发送一个method请求
		 *
		 * @param {Method} method method名称
		 * @param {*} [params]
		 * @param {object} [option] Object
		 * @param {number} [option.timeout] 超时时间，单位为秒，默认10秒
		 * @returns {Promise<RequestResult>}
		 * @memberof Client
		 */
		(method: Method, params?: unknown, option?: { timeout: number }): Promise<RequestResult>;

		/**
		 * 批量发送多个method请求，结果返回顺序与请求顺序一致
		 *
		 * @param {Method} arg.method method名称
		 * @param {*} [arg.params]
		 * @param {object} [arg.option] Object
		 * @param {number} [arg.option.timeout] 超时时间，单位为秒，默认10秒
		 * @returns {Promise<Array<RequestResult>>}
		 * @memberof Client
		 */
		(arg: Array<{ method: Method, params?: unknown, option?: { timeout: number } }>): Promise<Array<RequestResult>>;
	}

	interface Notify<Notice extends string = string> {
		/**
		 * 向服务器发送一次通知
		 *
		 * @param {Notice} notice 通知名称
		 * @param {*} [params]
		 * @returns {void}
		 * @memberof Client
		 */
		(notice: Notice, params?: unknown): void;

		/**
		 * 向服务器批量发送多个通知
		 *
		 * @param {Notice} arg.notice 通知名称
		 * @param {*} [arg.params]
		 * @returns {void}
		 * @memberof Client
		 */
		(arg: Array<{ notice: Notice, params?: unknown }>): void;
	}

	export interface Client<Method extends string = string, Notice extends string = string> {
		/** 连接状态：连接还没有打开. */
		readonly CONNECTING: number;
		/** 连接状态：连接已准备就绪. */
		readonly OPEN: number;
		/** 连接状态：正在关闭中. */
		readonly CLOSING: number;
		/** 连接状态：已关闭. */
		readonly CLOSED: number;
		/** 连接状态 */
		readonly status: number;

		/**
		 * 打开与服务器的连接
		 *
		 * @memberof Client
		 */
		readonly open: () => Promise<void>;

		/**
		 * 发送method请求
		 *
		 * @memberof Client
		 */
		readonly request: Request<Method>;

		/**
		 * 向服务器发送通知
		 *
		 * @memberof Client
		 */
		readonly notify: Notify<Notice>;

		/**
		 * ping
		 *
		 * @returns {Promise<RequestResult>}
		 * @memberof Client
		 */
		readonly ping: () => Promise<RequestResult>;

		/**
		 * 检查当前连接是否已经打开
		 *
		 * @memberof Client
		 */
		readonly connectInfo: () => Promise<RequestResult>;

		/**
		 * 注册一个/多个客户端离线时的回调函数
		 *
		 * @param args
		 * @returns {void}
		 */
		readonly offline: (...args: Array<() => void>) => void;

		/**
		 * 为某个method设置一个监听事件，一般用于服务器主动推送数据的监听
		 * 服务器主动推送的数据没有method字段时，可通过listening('unknownMsg', ...)来监听
		 * 可添加多次，监听事件会按添加顺序触发
		 *
		 * @param {string} method
		 * @param {ListeningCallbackFn} callback
		 * @param {boolean} [once]
		 * @returns {void}
		 * @memberof Client
		 */
		readonly listening: (method: string, callback: ListeningCallbackFn, once?: boolean) => void;

		/**
		 *
		 * @param {string} method
		 * @param {ListeningCallbackFn} callback
		 * @returns {void}
		 * @memberof Client
		 */
		readonly removeListening: (method: string, callback: ListeningCallbackFn) => void;

		/**
		 * 关闭当前连接
		 *
		 * @returns {void}
		 */
		readonly close: () => void;
	}
}
