import WebSocket from 'ws';
import { type ClientRequestArgs } from 'http';
import type { WsClient, Socket } from './typings.js';
import { uuid } from './lib.js';

const DEFAULT_TIMEOUT = 10;

export class WebsocketClient<Method extends string = string, Notice extends string = string> implements WsClient.Client<Method, Notice> {
	private webSocket!: WebSocket;
	private addr: string | URL;
	private configs!: WebSocket.ClientOptions | ClientRequestArgs;
	private options: WsClient.Options = { timeout: DEFAULT_TIMEOUT };
	private record: Record<string, { result: Socket.MethodResponse['result'], error: Socket.MethodResponse['error'] }> = {};
	private _close: Array<() => void> = [];

	constructor(address: string | URL, configs?: WebSocket.ClientOptions | ClientRequestArgs, options?: WsClient.Options) {
		this.addr = address;
		if (configs) {
			this.configs = configs;
		}
		if (options) {
			if (options.timeout) {
				this.options.timeout = options.timeout ?? DEFAULT_TIMEOUT;
			}
		}
	}

	private getRecordKey(method: string, id: string | number) {
		return `${method}-${id}`;
	}

	async open() {
		await new Promise((resolve, reject) => {
			this.webSocket = new WebSocket(this.addr, this.configs);
			this.webSocket.on('message', data => {
				let res: Socket.MethodResponse | null = null;

				try {
					res = JSON.parse(data.toString()) as Socket.MethodResponse;
				} catch (e) {
					console.log(e, data);
					return;
				}
				const cacheId = this.getRecordKey(res.method, res.id);

				if (this.record[cacheId]) {
					if (res.error) {
						this.record[cacheId].error = res.error;
					} else {
						this.record[cacheId].result = res.result;
					}
				} else {
					if (res.method) {
						this.webSocket.emit(res.method, res.error, res.result);
					}
				}
			});
			this.webSocket.on('open', resolve);
			this.webSocket.on('close', async () => {
				for (const fn of this._close) {
					await fn();
				}

				const pending = Object.values(this.record);

				this.record = {};
				for (const cache of pending) {
					cache.error = {
						code: -32002,
						message: 'Connection closed',
						data: 'Connection closed'
					};
				}
			});
			this.webSocket.on('error', reject);
		});
	}

	/** 原始websocket客户端实例 */
	get client() {
		return this.webSocket;
	}

	/**
	 * 发送一个method请求
	 * @param method
	 * @param params
	 * @param option 可选项
	 * @param option.timeout 可选项，超时时间，单位秒
	 * @returns {Promise<RequestResult>}
	 */
	private async _request(method: Method, params?: unknown, option?: { timeout: number }): Promise<WsClient.RequestResult> {
		if (this.status !== WebSocket.OPEN) {
			throw new Error('WebSocket is not open!');
		}
		if (!method) {
			throw new Error('method name is required!');
		}
		const id = uuid();
		const cacheId = this.getRecordKey(method, id);
		const self = this;
		const { timeout } = option || {};

		try {
			return await new Promise((resolve, reject) => {
				this.record[cacheId] = new class Cache {
					private timer: number | null;
					constructor() {
						const _self = this;

						this.timer = setTimeout(() => {
							_self.error = {
								code: -32001,
								message: 'Time out',
								data: 'Time out'
							};
						}, (timeout ?? self.options.timeout ?? DEFAULT_TIMEOUT) * 1000) as unknown as number;

						try {
							self.webSocket.send(JSON.stringify({
								jsonrpc: '2.0',
								id,
								method,
								params
							}));
						} catch (e) {
							console.log(e);
						}
					}

					private clearTimer() {
						if (this.timer) {
							clearTimeout(this.timer);
							this.timer = null;
						}
						delete self.record[cacheId];
					}

					set result(data: Socket.MethodResponse['result']) {
						this.clearTimer();
						resolve({ result: data });
					}

					set error(error: Socket.MethodResponse['error']) {
						this.clearTimer();
						reject({ error });
					}
				};
			});
		} catch (e) {
			return e as WsClient.RequestResult;
		}
	}

	/**
	 * 批量发送多个method请求，结果返回顺序与请求顺序一致
	 *
	 * @param {Method} arg.method method名称
	 * @param {*} [arg.params]
	 * @param {object} [arg.option] Object
	 * @param {number} [arg.option.timeout] 超时时间，单位为秒，默认10秒
	 * @returns {Promise<Array<RequestResult>>}
	 */
	request(arg: Array<{ method: Method, params?: unknown, option?: { timeout: number } }>): Promise<Array<WsClient.RequestResult>>;

	/**
	 * 发送一个method请求
	 *
	 * @param {Method} method method名称
	 * @param {*} [params]
	 * @param {object} [option] Object
	 * @param {number} [option.timeout] 超时时间，单位为秒，默认10秒
	 * @returns {Promise<RequestResult>}
	 */
	request(method: Method, params?: unknown, option?: { timeout: number }): Promise<WsClient.RequestResult>;

	async request(
		req: Method | Array<{ method: Method, params?: unknown, option?: { timeout: number } }>,
		params?: unknown,
		option?: { timeout: number }) {
		if (Array.isArray(req)) {
			const tasks = req.map(({ method, params, option }) => this._request(method, params, option));

			return await Promise.all(tasks);
		} else {
			return await this._request(req, params, option);
		}
	}

	/**
	 * 向服务器发送一次通知
	 *
	 * @param {Notice} notice 通知名称
	 * @param {*} [params]
	 * @returns {void}
	 */
	notify(notice: Notice, params?: unknown): void;

	/**
	 * 向服务器批量发送多个通知
	 *
	 * @param {Notice} arg.notice 通知名称
	 * @param {*} [arg.params]
	 * @returns {void}
	 * @memberof Client
	 */
	notify(arg: Array<{ notice: Notice, params?: unknown }>): void;

	notify(
		notice: Notice | Array<{ notice: Notice, params?: unknown }>,
		params?: unknown,
	) {
		if (this.status !== WebSocket.OPEN) {
			throw new Error('WebSocket is not open!');
		}
		const notifys = Array.isArray(notice) ? notice : [{ notice, params }];

		for (const { notice, params } of notifys) {
			try {
				this.webSocket.send(JSON.stringify({
					jsonrpc: '2.0',
					method: notice,
					params
				}));
			} catch (e) {
				console.log(e);
			}
		}
	}

	async ping(): Promise<WsClient.RequestResult> {
		return await this.request('ping' as Method);
	}

	async isConnected(): Promise<WsClient.RequestResult> {
		return await this.request('connect' as Method);
	}

	offline(...args: Array<() => void>): void {
		if (Array.isArray(args) && args.length > 0) {
			for (const fn of args) {
				if (typeof fn === 'function') {
					this._close.push(fn);
				}
			}
		}
	}

	listening(method: string, callback: WsClient.ListenCallbackFn, once?: boolean) {
		if (Boolean(once) === true) {
			this.webSocket.once(method, callback);
		} else {
			this.webSocket.on(method, callback);
		}
	}

	get removeListening() {
		return this.webSocket.removeListener;
	}

	get CONNECTING() {
		return WebSocket.CONNECTING;
	}

	get OPEN() {
		return WebSocket.OPEN;
	}

	get CLOSING() {
		return WebSocket.CLOSING;
	}

	get CLOSED() {
		return WebSocket.CLOSED;
	}

	get status() {
		return this.webSocket.readyState;
	}

	close() {
		this.webSocket.close();
	}
}
