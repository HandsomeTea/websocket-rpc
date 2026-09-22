import type { WebSocketService, Socket, AnyObject } from './typings.js';

export const _serverStore: {
    [key: string]: {
        methods: Record<string, WebSocketService.MethodFn<AnyObject, string>>;
        middlewares: Array<
            { type: 'global', fn: WebSocketService.MiddlewareFn<AnyObject, string> }
            | { type: 'scoped', method: string, fn: WebSocketService.MiddlewareFn<AnyObject, string> }
        >;
        noticeHandlers: Array<
            { type: 'global', fn: WebSocketService.NoticeFn<AnyObject> }
            | { type: 'scoped', notice: string, fn: WebSocketService.NoticeFn<AnyObject> }
        >;
        onlineCallbacks: Array<WebSocketService.OnlineCallbackFn<AnyObject, string>>;
        offlineCallbacks: Array<WebSocketService.OfflineCallbackFn<AnyObject>>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorCallbacks: Array<WebSocketService.ErrorCallbackFn<AnyObject, any, string>>;
        requestIds: Map<string | number, number>;
    }
} = {};

export const _sessionMap: Record<string, Socket.Link<AnyObject, string>> = {};
