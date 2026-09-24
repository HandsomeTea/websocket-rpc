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

	interface SetAttr<Attr> {
		/** 将attribute的键值设置到socket的属性中 */
		(attribute: Partial<Attr>): void;

		/** 为socket设置key为attribute属性，值为value */
		<K extends keyof Attr>(attribute: K, value: Attr[K]): void;
	}

	interface GetAttr<Attr> {
		/** 获取socket的全部属性 */
		(): Attr;

		/** 获取socket的某个属性 */
		<K extends keyof Attr>(attribute: K): Attr[K] | undefined;

		/** 获取某些属性 */
		<K extends keyof Attr>(attribute: K, ...attributes: Array<K>): { [Key in K]: Attr[Key] };
	}

	export interface MethodRequest {
		/** jsonrpc规范版本 */
		jsonrpc: '2.0'
		/** 一般为随机字符串或数字 */
		id?: string | number | null
		/** 请求的方法/业务标识 */
		method: string
		/** 请求的参数 */
		params?: unknown
	}

	export type ServerSuccessMessage<Result = unknown> = {
		result: Result;
		error?: never;
	};
	export type ServerErrorMessage = {
		result?: never;
		error: WebSocketService.RPCError;
	};
	export type ServerMessage<SendMethod extends string = string> = {
		jsonrpc: '2.0';
		/** 一般为随机字符串或数字 */
		id: string | number | null;
		/**
		 * - 非jsonrpc2.0标准字段。
		 * - 用于标记某个method的结果时，可取请求数据的method值；也可自定义取值，来标记服务器自定义的推送信息
		 * - 不可以为`unknownMsg`，以`unknownMsg`为名的method是客户端监听未知消息的固定method
		 */
		method?: SendMethod;
	} & (ServerSuccessMessage | ServerErrorMessage);

	export interface Link<Attr, SendMethod extends string = string> extends WebSocket {
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
		 * 发送符合jsonrpc2.0规范的数据，主要用于服务器主动推送数据给客户端
		 *
		 * - 使用示例:
		 * ```
		 * socket.sendout({
		 * 	method: 'xxx',
		 * 	result: ...
		 * });
		 *
		 * socket.sendout({
		 * 	method: 'xxx',
		 * 	error: {
		 * 		code: -32301,
		 * 		message: 'xxx',
		 * 	 	data: ...
		 * 	}
		 * });
		 *
		 * socket.sendout({
		 * 	result: ...
		 * });
		 *
		 * socket.sendout({
		 * 	id: 'xxxxxxx',
		 * 	method: 'xxx',
		 * 	result: ...
		 * });
		 * ```
		 *
		 * @template SendMethod
		 * @param {ServerMessage['id']} [id] 可选项，若为空(不含null)，则自动设置
		 * @param {ServerMessage<SendMethod>['method']} [method] 可选项，也非jsonrpc2.0标准字段，用于自定义业务标记
		 * @param {ServerSuccessMessage['result']} [result] 可选项，与message.error二选一
		 * @param {ServerErrorMessage['error']} [error] 可选项，与message.result二选一
		 * @memberof Link
		 */
		readonly sendout: (message:
			{
				id?: ServerMessage['id'],
				method?: ServerMessage<SendMethod>['method']
			} & (ServerSuccessMessage | ServerErrorMessage)
		) => Promise<void>;

		readonly setAttr: SetAttr<Attr>;
		readonly getAttr: GetAttr<Attr>;
		/**
		 * 删除socket的属性
		 *
		 * @param {...keyof Attr} attributes
		 */
		readonly removeAttr: (...attributes: Array<keyof Attr>) => void;
	}
}


export declare namespace WebSocketService {

	export interface Options {
		log?: boolean | ((module?: string) => Logger)
		jsonSerializer?: {
			/** 序列化方法，默认为JSON.stringify(优化了Error对象展示和浏览器端NODE_ENV判断) */
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
		/** 错误的堆栈信息 */
		stack?: string
	}

	/** 中间件阶段Attribute可能未完全设置，可能为空 */
	export type MiddlewareFn<Attribute extends AnyObject, SendMethod extends string = string, Params = unknown> = (params: Params, socket: Socket.Link<Partial<Attribute>, SendMethod>, method: string) => Partial<Attribute> | undefined | Promise<Partial<Attribute> | undefined>

	export type MethodFn<Attribute extends AnyObject, SendMethod extends string = string, Params = unknown> = (params: Params, socket: Socket.Link<Attribute, SendMethod>) => unknown | Promise<unknown>;

	export type NoticeFn<Attribute extends AnyObject, Params = unknown> = (params: Params, attribute: Attribute, notice: string) => void | Promise<void>;

	/** online阶段Attribute几乎未设置，可能为空 */
	export type OnlineCallbackFn<Attribute extends AnyObject, SendMethod extends string = string> = (socket: Socket.Link<Partial<Attribute>, SendMethod>, request: http.IncomingMessage) => void | Promise<void>;

	export type OfflineCallbackFn<Attribute extends AnyObject> = (attribute: Attribute, id: string) => void | Promise<void>;

	/** 中间件阶段可能触发错误回调，Attribute可能未完全获取到 */
	export type ErrorCallbackFn<Attribute extends AnyObject, E, SendMethod extends string = string> = (error: E, socket: Socket.Link<Partial<Attribute>, SendMethod>, reqData?: Socket.MethodRequest) => void | Promise<void>;

	interface Use<Attribute extends AnyObject, Method extends string = string, SendMethod extends string = string> {
		/**
		 * 注册适用于所有method的一个或多个中间件
		 * - 内置的ping和connect不会执行任何中间件
		 *
		 * @param {...Array<MiddlewareFn<Attribute, SendMethod>>} middlewares
		*/
		(middleware: MiddlewareFn<Attribute, SendMethod>, ...middlewares: Array<MiddlewareFn<Attribute, SendMethod>>): void;

		/**
		 * 注册只适用于某个method的一个或多个中间件
		 * - 内置的ping和connect不支持注册中间件
		 *
		 * @template Params
		 * @param {Method} method method名称
		 * @param {...Array<MiddlewareFn<Attribute, SendMethod, Params>>} middlewares
		*/
		<Params = unknown>(method: Method, ...middlewares: Array<MiddlewareFn<Attribute, SendMethod, Params>>): void;
	}

	interface Register<Attribute extends AnyObject, Method extends string = string, SendMethod extends string = string> {
		/**
		 * 注册一个method
		 *
		 * @template Params
		 * @param {Method} method method名称，不支持ping和connect(已内置)，若传入ping或connect，则忽略
		 * @param {MethodFn<Attribute, SendMethod, Params>} cb
		 */
		<Params = unknown>(method: Method, cb: MethodFn<Attribute, SendMethod, Params>): void;

		/**
		 * 注册一个或多个method
		 * - method名称不支持ping和connect(已内置)，若传入ping或connect，则忽略
		 *
		 * @param {Partial<Record<Method, MethodFn<Attribute, SendMethod>>>} methods
		 */
		(methods: Partial<Record<Method, WebSocketService.MethodFn<Attribute, SendMethod>>>): void;
	}

	interface OnNotice<Attribute extends AnyObject, OnNoticeMethod extends string = string> {
		/**
		 * 注册一个或多个针对所有notice消息的监听事件
		 *
		 * @param {...Array<NoticeFn<Attribute>>} noticeHandlers
		 */
		(noticeHandler: NoticeFn<Attribute>, ...noticeHandlers: Array<NoticeFn<Attribute>>): void;

		/**
		 * 注册一个或多个只适用于某个notice消息的监听事件
		 *
		 * @template Params
		 * @param {OnNoticeMethod} notice 消息事件名称，取消息中的method值
		 * @param {...Array<NoticeFn<Attribute>>} noticeHandlers
		 */
		<Params = unknown>(notice: OnNoticeMethod, ...noticeHandlers: Array<NoticeFn<Attribute, Params>>): void;
	}

	/**
	 * 根据传入的attribute做判断，返回当前socket是否符合函数筛选要求
	 */
	export type IsThisSocket<Attr> = (attribute: Attr) => boolean | undefined;

	interface GetSocketAttr<Attribute extends AnyObject> {
		/**
		 * 获取某个socket连接的全部属性
		 *
		 * @param {string} connectId
		 */
		(connectId: string): Attribute | undefined;

		/**
		 * 获取某个socket连接的某个属性
		 *
		 * @template K
		 * @param {string} connectId
		 * @param {K} attribute
		 */
		<K extends keyof Attribute>(connectId: string, attribute: K): Attribute[K] | undefined;

		/**
		 * 获取某个socket连接的某些属性
		 *
		 * @template K
		 * @param {string} connectId
		 * @param {...Array<K>} attributes
		 */
		<K extends keyof Attribute>(connectId: string, ...attributes: Array<K>): Pick<Attribute, Array<K>[number]> | undefined;
	}

	interface GetSocketsAttr<Attribute extends AnyObject> {
		/**
		 * 获取某些socket连接的全部属性
		 *
		 * @param {IsThisSocket<Attribute>} is
		 */
		(is: IsThisSocket<Attribute>): Array<Attribute>;

		/**
		 * 获取某些socket连接的某个属性
		 *
		 * @template K
		 * @param {IsThisSocket<Attribute>} is
		 * @param {K} attribute
		 */
		<K extends keyof Attribute>(is: IsThisSocket<Attribute>, attribute: K): Array<Attribute[K]>;

		/**
		 * 获取某些socket连接的某些属性
		 *
		 * @template K
		 * @param {IsThisSocket<Attribute>} is
		 * @param {...Array<K>} attributes
		 */
		<K extends keyof Attribute>(is: IsThisSocket<Attribute>, ...attributes: Array<K>): Array<Pick<Attribute, Array<K>[number]>>;
	}

	export interface Server<Attribute extends AnyObject, Method extends string = string, OnNoticeMethod extends string = string, SendMethod extends string = string> {

		/**
		 * 启动服务
		 *
		 * @memberof Server
		 */
		readonly start: () => Promise<void>;

		readonly register: Register<Attribute, Method, SendMethod>;

		readonly use: Use<Attribute, Method, SendMethod>;

		readonly onNotice: OnNotice<Attribute, OnNoticeMethod>;

		/**
		 * 根据socket的连接id获取socket对象
		 *
		 * @param {string} connectId
		 * @returns {(Socket.Link<Attribute, SendMethod> | undefined)}
		 * @memberof Server
		 */
		readonly getSocket: (connectId: string) => Socket.Link<Attribute, SendMethod> | undefined;

		/**
		 * 根据socket连接的属性数据获取socket对象
		 *
		 * @param {IsThisSocket<Attribute>} is
		 * @returns {Set<Socket.Link<Attribute, SendMethod>>}
		 * @memberof Server
		 */
		readonly getSockets: (is: IsThisSocket<Attribute>) => Set<Socket.Link<Attribute, SendMethod>>;

		/**
		 * 获取单个连接上的attribute信息
		 *
		 * @memberof Server
		 */
		readonly getSocketAttr: GetSocketAttr<Attribute>;

		/**
		 * 获取某些连接上的attribute信息
		 *
		 * @memberof Server
		 */
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
		 * 新连接构建成功后的回调
		 *
		 * @param {...Array<OnlineCallbackFn<Attribute, SendMethod>>} args
		 * @memberof Server
		 */
		readonly online: (...args: Array<OnlineCallbackFn<Attribute, SendMethod>>) => void;

		/**
		 * 连接断开后的回调
		 *
		 * @param {...Array<OfflineCallbackFn<Attribute>>} args
		 * @memberof Server
		 */
		readonly offline: (...args: Array<OfflineCallbackFn<Attribute>>) => void;

		/**
		 * middleware或method运行出错时的错误处理。
		 * - 注意：只处理middleware和method执行抛出的错误
		 *
		 * @template E
		 * @param {...Array<ErrorCallbackFn<Attribute, E, SendMethod>>} args
		 * @memberof Server
		 */
		readonly error: <E>(...args: Array<ErrorCallbackFn<Attribute, E, SendMethod>>) => void;

		/**
		 * 停止服务
		 *
		 * @memberof Server
		 */
		readonly close: () => void;

		/**
		 * 当前服务器实例中所有socket连接
		 *
		 * @type {Set<Socket.Link<Attribute, SendMethod>>}
		 * @memberof Server
		 */
		readonly clients: Set<Socket.Link<Attribute, SendMethod>>;

		/**
		 * 当前服务器实例中所有定义的method名称
		 *
		 * @type {Array<string>}
		 * @memberof Server
		 */
		readonly methodList: Array<string>;

		/**
		 * 当前服务器实例监听的端口
		 *
		 * @memberof Server
		 */
		readonly port: number | undefined;
	}
}


export declare namespace WsClient {

	export interface Options {
		/**
		 * - 接收method返回超时时间，单位为秒，默认10秒
		 * - 设置为0表示不设置超时
		 */
		timeout?: number;
		/**
		 * - 消息序列化/反序列化处理
		 * - 默认使用`JSON.stringify(优化了Error对象展示和浏览器端NODE_ENV判断)`/`JSON.parse`
		 */
		jsonSerializer?: WebSocketService.Options['jsonSerializer'];
		/**
		 * - 该函数在客户端接收到服务端消息后，消息反序列化之前运行
		 * - 可用于对服务端发送消息的加密/压缩等解析和处理
		 */
		perMessageHandler?: (data: unknown) => string | Promise<string>;
	}

	export type ListeningCallbackFn = (error: Socket.ServerErrorMessage['error'] | null, result: Socket.ServerSuccessMessage['result']) => void;
	export type RequestResult<Result = unknown> = Socket.ServerSuccessMessage<Result> | Socket.ServerErrorMessage;

	interface Request<Method extends string = string> {
		/**
		 * 发送一个method请求
		 *
		 * @template Result
		 * @param {Method} method method名称
		 * @param {*} [params]
		 * @param {object} [option] Object
		 * @param {number} [option.timeout] 超时时间，单位为秒，默认10秒
		 * @returns {Promise<{ result: Result, error?: never } | { error: Socket.ServerErrorMessage['error'], result?: never }>}
		 * @memberof Client
		 */
		<Result = unknown>(method: Method, params?: unknown, option?: { timeout: number }): Promise<{ result: Result, error?: never } | { error: Socket.ServerErrorMessage['error'], result?: never }>;
	}

	interface BatchRequests<Method extends string = string> {
		/**
		 * 批量发送多个method请求，结果返回顺序与请求顺序一致
		 *
		 * - arg.method method名称
		 * - arg.params 参数
		 * - arg.option.timeout 超时时间，单位为秒，默认10秒, 0表示不设置超时
		 * @param {Array<{ method: Method, params?: unknown, option?: { timeout: number } }>} arg
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
		 * - arg.notice 通知名称
		 * - arg.params 参数
		 * @param {Array<{ notice: Notice, params?: unknown }>} arg
		 * @returns {void}
		 * @memberof Client
		 */
		(arg: Array<{ notice: Notice, params?: unknown }>): void;
	}

	export interface Client<
		Method extends string = string,
		Notice extends string = string,
		ListeningMethod extends string = string
	> {
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
		 * 批量发送多个method请求，结果返回顺序与请求顺序一致
		 *
		 * @memberof Client
		 */
		readonly batch: BatchRequests<Method>;

		/**
		 * 向服务器发送通知
		 *
		 * @memberof Client
		 */
		readonly notify: Notify<Notice>;

		/**
		 * 为某个method设置一个监听事件，一般用于服务器主动推送数据的监听
		 * 服务器主动推送的数据没有method字段时，可通过listening('unknownMsg', ...)来监听
		 * 可添加多次，监听事件会按添加顺序触发
		 *
		 * @param {ListeningMethod} method
		 * @param {ListeningCallbackFn} callback
		 * @returns {void}
		 * @memberof Client
		 */
		readonly listening: (method: ListeningMethod, callback: ListeningCallbackFn) => void;

		/**
		 * 同listening，但只监听一次就移除
		 *
		 * @param {ListeningMethod} method
		 * @param {ListeningCallbackFn} callback
		 * @returns {void}
		 * @memberof Client
		 */
		readonly listeningOnce: (method: ListeningMethod, callback: ListeningCallbackFn) => void;

		/**
		 * 移除对服务端某个method消息的监听事件
		 *
		 * - 例如：
		 * ```
		 * const calback = (error, result) => { ... };
		 * client.listening('method', callback);
		 * client.removeListening('method', callback);
		 * ```
		 *
		 * @param {ListeningMethod} method
		 * @param {ListeningCallbackFn} callback
		 * @returns {void}
		 * @memberof Client
		 */
		readonly removeListening: (method: ListeningMethod, callback: ListeningCallbackFn) => void;

		/**
		 * ping
		 *
		 * @returns {Promise<RequestResult<'pong'>>}
		 * @memberof Client
		 */
		readonly ping: () => Promise<RequestResult<'pong'>>;

		/**
		 * 获取连接信息(如连接id)
		 *
		 * @returns {Promise<RequestResult<{ msg: 'connected', session: string }>>}
		 * @memberof Client
		 */
		readonly connectInfo: () => Promise<RequestResult<{ msg: 'connected', session: string }>>;

		/**
		 * 注册一个/多个客户端离线时的回调函数
		 *
		 * @param callbacks
		 * @returns {void}
		 * @memberof Client
		 */
		readonly offline: (...callbacks: Array<() => void>) => void;

		/**
		 * 关闭当前连接
		 *
		 * @returns {void}
		 * @memberof Client
		 */
		readonly close: () => void;
	}
}
