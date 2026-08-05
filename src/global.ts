import type { WebsocketService, Socket, AnyObject } from './typings.js';

export const _serverStore: {
    [key: string]: {
        methods: Record<string, WebsocketService.MethodFn<AnyObject>>;
        middlewares: Array<
            { type: 'global', fn: WebsocketService.MiddlewareFn<AnyObject> }
            | { type: 'scoped', method: string, fn: WebsocketService.MiddlewareFn<AnyObject> }
        >;
        noticeHandlers: Array<
            { type: 'global', fn: WebsocketService.NoticeFn<AnyObject> }
            | { type: 'scoped', notice: string, fn: WebsocketService.NoticeFn<AnyObject> }
        >;
        onlineCallbacks: Array<WebsocketService.OnlineCallbackFn<AnyObject>>;
        offlineCallbacks: Array<WebsocketService.OfflineCallbackFn<AnyObject>>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorCallbacks: Array<WebsocketService.ErrorCallbackFn<AnyObject, any>>;
        requestIds: Record<string, number>;
    }
} = {};

export const _sessionMap: Record<string, Socket.Link<AnyObject>> = {};
