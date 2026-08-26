import WebSocket from 'ws';
import { type ClientRequestArgs } from 'http';
import type { WsClient } from './typings.js';
import { BaseWsClient } from './common-client.js';

export class WebSocketClient<Method extends string = string, Notice extends string = string> extends BaseWsClient<WebSocket, Method, Notice> {

	private addr: string | URL;
	private configs!: WebSocket.ClientOptions | ClientRequestArgs;

	constructor(address: string | URL, configs?: WebSocket.ClientOptions | ClientRequestArgs, options?: WsClient.Options) {
		super();

		this.addr = address;
		if (configs) {
			this.configs = configs;
		}
		this.init(options);
	}

	async open() {
		await new Promise((resolve, reject) => {
			this.webSocket = new WebSocket(this.addr, this.configs);
			this.webSocket.on('message', async data => await this.messageHandler(data));
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
