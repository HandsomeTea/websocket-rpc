import { uuid } from '../lib.js';
import type { Socket, AnyObject } from '../typings.js';
import { _serverStore } from '../global.js';

const getErrorFns = (serverId: string) => _serverStore[serverId]?.errorCallbacks || [];
const executeErrorFns = async <T>(error: T, socket: Socket.Link<AnyObject>, serverId: string, reqData?: Socket.MethodRequest) => {
    // try {
    const errorFns = getErrorFns(serverId);

    for (const fn of errorFns) {
        // @ts-ignore
        await fn(error, socket, reqData);
    }
    // } catch (error) {
    //     //
    // }
};
const processRequest = async (socket: Socket.Link<AnyObject>, serverId: string, data: { jsonrpc: '2.0', method: string, id: string | number, params?: unknown }) => {
    const { id, method, params } = data;

    if (socket.option.logger) {
        socket.option.logger(`request:${method}`).debug(socket.option.RPCSerializer.serialize(data));
    }

    // ====================================== 特殊method处理 ======================================
    if (method === 'ping') {
        socket.sendout({
            id: `${id}`,
            method,
            result: 'pong'
        });
        delete _serverStore[serverId]?.requestIds[id];
        return;
    } else if (method === 'connect') {
        socket.sendout({ id: `${id}`, method, result: { msg: 'connected', session: socket.id } });
        delete _serverStore[serverId]?.requestIds[id];
        return;
    }

    // ====================================== method是否存在 ======================================
    if (!_serverStore[serverId]?.methods[method]) {
        if (socket.option.logger) {
            socket.option.logger(`request:${method}`).error(`Method not found with ${socket.option.RPCSerializer.serialize(data)}`);
        }
        if (getErrorFns(serverId).length > 0) {
            await executeErrorFns(new Error('Method not found'), socket, serverId, data);
        } else {
            socket.sendout({
                id: `${id}`,
                method,
                error: {
                    code: -32601,
                    message: 'Method not found',
                    data: 'Method not found'
                }
            });
        }
        delete _serverStore[serverId]?.requestIds[id];
        return;
    }

    // ====================================== 执行中间件 ======================================
    const validType = new Set(['string', 'number', 'boolean']);

    for (const middleware of _serverStore[serverId].middlewares) {
        try {
            const result = middleware.type === 'global' ?
                // @ts-ignore
                await middleware.fn(params, socket, method) :
                middleware.type === 'scoped' && method === middleware.method ?
                    // @ts-ignore
                    await middleware.fn(params, socket, method) : null;

            if (result && typeof result === 'object' && !Array.isArray(result)) {
                for (const key of Object.keys(result)) {
                    const value = result[key];

                    if (!validType.has(typeof value)) {
                        if (socket.option.logger) {
                            socket.option.logger(`middleware:${method}`).warn(`invalid new socket attribute [${key}] value: ${value}, ignored!`);
                        }
                        continue;
                    }

                    if (value === socket.attribute[key]) {
                        continue;
                    }

                    if (key in socket.attribute) {
                        if (socket.option.logger) {
                            socket.option.logger(`middleware:${method}`).warn(`socket attribute [${key}] changed: ${socket.attribute[key]} => ${value}`);
                        }
                    }

                    if (value !== undefined) {
                        socket.attribute[key] = value;
                    }
                }
            }
        } catch (error) {
            if (socket.option.logger) {
                socket.option.logger(`middleware:${method}`).error(socket.option.RPCSerializer.serialize(error));
            }
            if (getErrorFns(serverId).length > 0) {
                await executeErrorFns(error, socket, serverId, data);
            } else {
                socket.sendout({
                    id: `${id}`,
                    method,
                    error: {
                        code: -32001,
                        message: 'Method Request failed',
                        data: error
                    }
                });
            }
            delete _serverStore[serverId]?.requestIds[id];
            return;
        }
    }

    // ====================================== 执行method ======================================
    try {
        const result = await _serverStore[serverId].methods[method](params, socket);

        socket.sendout({
            id: `${id}`,
            method,
            result
        });
    } catch (error) {
        if (socket.option.logger) {
            socket.option.logger(`method:${method}`).error(socket.option.RPCSerializer.serialize(error));
        }
        if (getErrorFns(serverId).length > 0) {
            await executeErrorFns(error, socket, serverId, data);
        } else {
            socket.sendout({
                id: `${id}`,
                method,
                error: {
                    code: -32001,
                    message: 'Method Request failed',
                    data: error
                }
            });
        }
    }
    delete _serverStore[serverId]?.requestIds[id];
};

export default (socket: Socket.Link<AnyObject>, serverId: string): void => {
    socket.on('message', async parameter => {
        // ====================================== 数据格式化 ======================================
        let data = null;

        try {
            data = socket.option.RPCSerializer.deserialize(parameter.toString());
        } catch (error) {
            if (socket.option.logger) {
                socket.option.logger('socket-receive').error(`Parse error with ${parameter.toString()}`);
            }
            if (getErrorFns(serverId).length > 0) {
                return await executeErrorFns(error, socket, serverId);
            } else {
                return socket.sendout({
                    id: uuid(),
                    method: '',
                    error: {
                        code: -32700,
                        message: 'Parse error',
                        data: (error as Error).message
                    }
                });
            }
        }

        const _datas = data as Socket.MethodRequest | Array<Socket.MethodRequest>;
        const datas = Array.isArray(_datas) ? _datas : [_datas];

        for (const data of datas) {
            // ====================================== 数据合法性检查 ======================================
            const { jsonrpc, method, id, params } = data;

            if (jsonrpc !== '2.0') {
                if (socket.option.logger) {
                    socket.option.logger('socket-receive').error(`Invalid params with ${socket.option.RPCSerializer.serialize(data)}`);
                }
                const errorStr = `Invalid field[jsonrpc]: ${jsonrpc}`;

                if (getErrorFns(serverId).length > 0) {
                    await executeErrorFns(new Error(errorStr), socket, serverId, data);
                } else {
                    socket.sendout({
                        id: id || uuid(),
                        method: method || '',
                        error: {
                            code: -32602,
                            message: 'Invalid params',
                            data: errorStr
                        }
                    });
                }
                continue;
            }

            if (!(method && typeof method === 'string')) {
                if (socket.option.logger) {
                    socket.option.logger('socket-receive').error(`Invalid params with ${socket.option.RPCSerializer.serialize(data)}`);
                }
                const errorStr = `Invalid field[method]: ${socket.option.RPCSerializer.serialize(method)}`;

                if (getErrorFns(serverId).length > 0) {
                    await executeErrorFns(new Error(errorStr), socket, serverId, data);
                } else {
                    socket.sendout({
                        id: id || uuid(),
                        method: method || '',
                        error: {
                            code: -32602,
                            message: 'Invalid params',
                            data: errorStr
                        }
                    });
                }
                continue;
            }

            if (!(
                (!!id || id === 0) &&
                (typeof id === 'string' || typeof id === 'number')
            )) {
                const noticeHandlers = _serverStore[serverId]?.noticeHandlers || [];

                if (noticeHandlers.length > 0) {
                    for (const noticeHandler of noticeHandlers) {
                        try {
                            if (
                                noticeHandler.type === 'global'
                                || noticeHandler.type === 'scoped' && method === noticeHandler.notice
                            ) {
                                await noticeHandler.fn(params, socket.attribute, method);
                            }
                        } catch (error) {
                            if (socket.option.logger) {
                                socket.option.logger(`notice:${method}`).error(socket.option.RPCSerializer.serialize(error));
                            }
                            if (getErrorFns(serverId).length > 0) {
                                await executeErrorFns(error, socket, serverId, data);
                            }
                        }
                    }
                }
                continue;
            }

            if (typeof _serverStore[serverId]?.requestIds[id] !== 'undefined') {
                if (socket.option.logger) {
                    socket.option.logger('socket-receive').error(`duplicate request with ${parameter.toString()}`);
                }
                socket.sendout({
                    id,
                    method: method || '',
                    error: {
                        code: -32600,
                        message: 'Invalid Request',
                        data: `Duplicate request id: ${id}`
                    }
                });
                continue;
            }
            // @ts-ignore
            _serverStore[serverId].requestIds[id] = Date.now();
            // ====================================== 执行 ======================================
            processRequest(socket, serverId, data as Socket.MethodRequest & { id: string | number });
        }
    });
};
