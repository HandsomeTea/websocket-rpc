import WebSocket from 'ws';
import { type ClientRequestArgs } from 'http';
import type { WsClient, Socket } from './typings.js';
import { BaseWsClient, CLIENT_DEFAULT_TIMEOUT } from './common-client.js';

export class WebSocketClient<Method extends string = string, Notice extends string = string> extends BaseWsClient<WebSocket, Method, Notice> {

	private addr: string | URL;
	private configs!: WebSocket.ClientOptions | ClientRequestArgs;

	constructor(address: string | URL, configs?: WebSocket.ClientOptions | ClientRequestArgs, options?: WsClient.Options) {
		super();

		this.addr = address;
		if (configs) {
			this.configs = configs;
		}
		if (options) {
			if (options.timeout || options.timeout === 0) {
				this.options.timeout = options.timeout ?? CLIENT_DEFAULT_TIMEOUT;
			}
		}
	}

	async open() {
		await new Promise((resolve, reject) => {
			this.webSocket = new WebSocket(this.addr, this.configs);
			this.webSocket.on('message', data => {
				let res: Socket.ServerMessage | null = null;

				try {
					res = JSON.parse(data.toString()) as Socket.ServerMessage;
				} catch (e) {
					console.log(e, data);
					return;
				}
				const cacheId = this.getRecordKey(res.id, res.method);

				if (cacheId && this.record[cacheId]) {
					if (res.error) {
						this.record[cacheId].error = res.error;
					} else {
						this.record[cacheId].result = res.result;
					}
				} else if (res.method) { // 服务端的notify
					this.emit(res.method, res);
				} else { // 未知消息
					this.emit('unknownMsg', res);
				}
			});
			this.webSocket.on('open', resolve);
			this.webSocket.on('close', async () => {
				for (const fn of this._close) {
					await fn();
				}

				this.clearPendingRequests('Connection closed');
			});
			this.webSocket.on('error', e => {
				this.clearPendingRequests(`Connection error: ${e.message}`);
				reject(e);
			});
		});
	}
}
