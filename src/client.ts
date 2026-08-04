import WebSocket from 'ws';
import { type ClientRequestArgs } from 'http';
import type { WsClient, Socket } from './typings.js';
import { uuid } from './lib.js';

const DEFAULT_TIMEOUT = 10;

export class WebsocketClient<M extends string = string> implements WsClient.Client<M> {
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
				this.options.timeout = options.timeout || DEFAULT_TIMEOUT;
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
				const res = JSON.parse(data.toString()) as Socket.MethodResponse;
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
	 *
	 * @param method
	 * @param params
	 * @param option 可选项
	 * @param option.timeout 可选项，超时时间，单位秒
	 * @returns
	 */
	async request(method: M, params?: unknown, option?: { timeout: number }): Promise<WsClient.RequestResult> {
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
						}, (timeout || self.options.timeout || DEFAULT_TIMEOUT) * 1000) as unknown as number;

						self.webSocket.send(JSON.stringify({
							jsonrpc: '2.0',
							id,
							method,
							params: params || {}
						}));
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

	async ping(): Promise<WsClient.RequestResult> {
		return await this.request('ping' as M);
	}

	async isConnected(): Promise<WsClient.RequestResult> {
		return await this.request('connect' as M);
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
