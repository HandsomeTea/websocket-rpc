import type { WebSocketService, Socket, WsClient, AnyObject } from './typings.js';

export type MiddlewareFn<Attribute extends AnyObject, SendMethod extends string = string, Params = unknown> = WebSocketService.MiddlewareFn<Attribute, SendMethod, Params>;

export type MethodFn<Attribute extends AnyObject, SendMethod extends string = string, Params = unknown> = WebSocketService.MethodFn<Attribute, SendMethod, Params>;

export type NoticeFn<Attribute extends AnyObject> = WebSocketService.NoticeFn<Attribute>;

export type OnlineCallbackFn<Attribute extends AnyObject, SendMethod extends string = string> = WebSocketService.OnlineCallbackFn<Attribute, SendMethod>;

export type OfflineCallbackFn<Attribute extends AnyObject> = WebSocketService.OfflineCallbackFn<Attribute>;

export type ErrorCallbackFn<Attribute extends AnyObject, E extends Error = Error, SendMethod extends string = string> = WebSocketService.ErrorCallbackFn<Attribute, E, SendMethod>;

export type Link<Attribute extends AnyObject, SendMethod extends string = string> = Socket.Link<Attribute, SendMethod>;

export type ClientListeningCallbackFn = WsClient.ListeningCallbackFn;

export type Attribute = AnyObject;

export type RPCError = WebSocketService.RPCError;

export type ServerMessage<MessageMethod extends string = string> = Socket.ServerMessage<MessageMethod>;

export type RequestResult<Result = unknown> = WsClient.RequestResult<Result>;

export type ServerOptions = WebSocketService.Options;

export type ClientOptions = WsClient.Options;

export { WebSocketServer } from './server.js';

export { WebSocketClient } from './client.js';

export { BrowserWsClient } from './browser.js';

export { JsonRPCIdGenerator } from './id-generator.js';
