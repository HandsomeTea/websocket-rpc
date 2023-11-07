import { Socket, WebsocketMethodFn, WebsocketMiddlewareFn } from './typings';

/**global变量 */
declare global {
    var _WebsocketServer: {
        sessionMap: Record<string, Socket<Record<string, any>>>;
        methods: Record<string, WebsocketMethodFn<Record<string, any>>>;
        middlewares: Array<WebsocketMiddlewareFn<Record<string, any>> | Record<string, WebsocketMiddlewareFn<Record<string, any>>>>;
    }
}
