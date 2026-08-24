import type { WebSocketService, Socket, WsClient, AnyObject } from './typings.js';

export type MiddlewareFn<Attribute extends AnyObject> = WebSocketService.MiddlewareFn<Attribute>;

export type MethodFn<Attribute extends AnyObject> = WebSocketService.MethodFn<Attribute>;

export type NoticeFn<Attribute extends AnyObject> = WebSocketService.NoticeFn<Attribute>;

export type OnlineCallbackFn<Attribute extends AnyObject> = WebSocketService.OnlineCallbackFn<Attribute>;

export type OfflineCallbackFn<Attribute extends AnyObject> = WebSocketService.OfflineCallbackFn<Attribute>;

export type ErrorCallbackFn<Attribute extends AnyObject, E> = WebSocketService.ErrorCallbackFn<Attribute, E>;

export type Link<Attribute extends AnyObject> = Socket.Link<Attribute>;

export type ClientListeningCallbackFn = WsClient.ListeningCallbackFn;

export type Attribute = AnyObject;

export type RPCError = WebSocketService.RPCError;

export type ServerMessage = Socket.ServerMessage;

export type RequestResult = WsClient.RequestResult;

export type ServerOptions = WebSocketService.Options;

export type ClientOptions = WsClient.Options;

export { WebSocketServer } from './server.js';

export { WebSocketClient } from './client.js';

export { BrowserWsClient } from './browser.js';
