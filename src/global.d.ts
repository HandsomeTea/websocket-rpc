/* eslint-disable */
import { Socket, WebsocketService } from './typings';

/**global变量 */
declare global {
	var _WebsocketServer: {
		sessionMap: Record<string, Socket.Link<Record<string, any>>>;
		methods: Record<string, WebsocketService.MethodFn<Record<string, any>>>;
		middlewares: Array<WebsocketService.MiddlewareFn<Record<string, any>> | Record<string, WebsocketService.MiddlewareFn<Record<string, any>>>>;
	}
}
