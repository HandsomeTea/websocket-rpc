import { BaseWsClient, CLIENT_DEFAULT_TIMEOUT } from './common-client.js';
import type { Socket, WsClient } from './typings.js';

export class BrowserWsClient<Method extends string = string, Notice extends string = string> extends BaseWsClient<WebSocket, Method, Notice> {

    private addr: string | URL;

    constructor(address: string | URL, options?: WsClient.Options) {
        super();

        this.addr = address;
        if (options) {
            if (options.timeout || options.timeout === 0) {
                this.options.timeout = options.timeout ?? CLIENT_DEFAULT_TIMEOUT;
            }
        }
    }

    async open() {
        await new Promise((resolve, reject) => {
            this.webSocket = new WebSocket(this.addr);
            this.webSocket.onmessage = (event: MessageEvent) => {
                let res: Socket.ServerMessage | null = null;

                try {
                    res = JSON.parse(event.data.toString()) as Socket.ServerMessage;
                } catch (e) {
                    console.log(e, event.data);
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
            };
            this.webSocket.onopen = resolve;
            this.webSocket.onclose = async () => {
                for (const fn of this._close) {
                    await fn();
                }

                this.clearPendingRequests('Connection closed');
            };
            this.webSocket.onerror = e => {
                this.clearPendingRequests('Connection error');
                reject(e);
            };
        });
    }
}
