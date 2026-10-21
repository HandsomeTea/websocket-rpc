import type { WebSocketService, Socket, WsClient, AnyObject } from './typings.js';

export type MiddlewareFn<Attribute extends AnyObject, SendoutMethod extends string = string, Params = unknown> = WebSocketService.MiddlewareFn<Attribute, SendoutMethod, Params>;

export type MethodFn<Attribute extends AnyObject, SendoutMethod extends string = string, Params = unknown, Return = unknown> = WebSocketService.MethodFn<Attribute, SendoutMethod, Params, Return>;

export type NoticeFn<Attribute extends AnyObject, Params = unknown> = WebSocketService.NoticeFn<Attribute, Params>;

export type OnlineCallbackFn<Attribute extends AnyObject, SendoutMethod extends string = string> = WebSocketService.OnlineCallbackFn<Attribute, SendoutMethod>;

export type OfflineCallbackFn<Attribute extends AnyObject> = WebSocketService.OfflineCallbackFn<Attribute>;

export type ErrorCallbackFn<Attribute extends AnyObject, E extends Error = Error, SendoutMethod extends string = string> = WebSocketService.ErrorCallbackFn<Attribute, E, SendoutMethod>;

export type Link<Attribute extends AnyObject, SendoutMethod extends string = string> = Socket.Link<Attribute, SendoutMethod>;

export type ClientListeningCallbackFn<Result = unknown> = WsClient.ListeningCallbackFn<Result>;

export type Attribute = AnyObject;

export type RPCError = WebSocketService.RPCError;

export type ServerMessage<MessageMethod extends string = string> = Socket.ServerMessage<MessageMethod>;

export type RequestResult = WsClient.RequestResult;

export type ServerOptions = WebSocketService.Options;

export type ClientOptions = WsClient.Options;

export { WebSocketServer } from './server.js';

export { WebSocketClient } from './client.js';

export { BrowserWsClient } from './browser.js';

export { JsonRPCIdGenerator } from './id-generator.js';
