import { BaseWsClient } from './common-client.js';
import type { WsClient } from './typings.js';

/**
 * 浏览器端导入方式：
 * - `import { BrowserWsClient } from '@coco-sheng/websocket-rpc/browser';`
 */
export class BrowserWsClient<Method extends string = string, Notice extends string = string, ListeningMethod extends string = string> extends BaseWsClient<WebSocket, Method, Notice, ListeningMethod> {

    private addr: string | URL;

    constructor(address: string | URL, options?: WsClient.Options) {
        super();

        this.addr = address;
        this.init(options);
    }

    async open() {
        await new Promise((resolve, reject) => {
            this.webSocket = new WebSocket(this.addr);
            this.webSocket.onmessage = async (event: MessageEvent) => await this.messageHandler(event.data);
            this.webSocket.onopen = resolve;
            this.webSocket.onclose = async () => await this.closeHandler();
            this.webSocket.onerror = e => {
                this.clearPendingRequests('Connection error');
                reject(e);
            };
        });
    }
}
