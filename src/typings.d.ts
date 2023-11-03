import { Socket, WebsocketMiddlewareFn, WebsocketMethodFn } from './websocket';

/**global变量 */
declare global {
    var _WebsocketServer: {
        sessionMap: Record<string, Socket>;
        methods: Record<string, WebsocketMethodFn>;
        middlewares: Array<WebsocketMiddlewareFn | Record<string, WebsocketMiddlewareFn>>;
    }
}
