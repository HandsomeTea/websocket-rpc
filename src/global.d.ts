import { Socket, WebsocketService } from './typings';

/**global变量 */
declare global {
    var _WebsocketServer: {
        sessionMap: Record<string, Socket.Link<Record<string, any>>>;
        methods: Record<string, WebsocketService.WebsocketMethodFn<Record<string, any>>>;
        middlewares: Array<WebsocketService.WebsocketMiddlewareFn<Record<string, any>> | Record<string, WebsocketService.WebsocketMiddlewareFn<Record<string, any>>>>;
    }
}
