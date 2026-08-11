import type { WebsocketService, Socket, WsClient, AnyObject } from './typings.js';

export type MiddlewareFn<Attribute extends AnyObject> = WebsocketService.MiddlewareFn<Attribute>;

export type MethodFn<Attribute extends AnyObject> = WebsocketService.MethodFn<Attribute>;

export type NoticeFn<Attribute extends AnyObject> = WebsocketService.NoticeFn<Attribute>;

export type OnlineCallbackFn<Attribute extends AnyObject> = WebsocketService.OnlineCallbackFn<Attribute>;

export type OfflineCallbackFn<Attribute extends AnyObject> = WebsocketService.OfflineCallbackFn<Attribute>;

export type ErrorCallbackFn<Attribute extends AnyObject, E> = WebsocketService.ErrorCallbackFn<Attribute, E>;

export type Link<Attribute extends AnyObject> = Socket.Link<Attribute>;

export type ListenCallbackFn = WsClient.ListenCallbackFn;

export type Attribute = AnyObject;

export type RPCError = WebsocketService.RPCError;

export type MethodResponse = Socket.MethodResponse;

export type RequestResult = WsClient.RequestResult;

export type ServerOptions = WebsocketService.Options;

export type ClientOptions = WsClient.Options;

export { WebsocketServer } from './server.js';

export { WebsocketClient } from './client.js';
