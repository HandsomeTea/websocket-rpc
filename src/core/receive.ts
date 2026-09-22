import type { Socket, AnyObject, Logger } from '../typings.js';
import { _serverStore } from '../global.js';

const getErrorFns = (serverId: string) => _serverStore[serverId]?.errorCallbacks || [];
const executeErrorFns = async <T>(error: T, socket: Socket.Link<AnyObject, string>, serverId: string, reqData?: Socket.MethodRequest) => {
    const errorFns = getErrorFns(serverId);
    const cbSocket = socket as unknown as Socket.Link<Partial<AnyObject>, string>;

    for (const fn of errorFns) {
        try {
            await fn(error, cbSocket, reqData);
        } catch (error) {
            if (socket.logger) {
                socket.logger(`error:${fn.name}`).error(String(error));
            }
        }
    }
};
const baseTypeOf = new Set(['string', 'number', 'boolean']);
const isValidObject = (result: unknown): result is Record<string, unknown> =>
    Object.prototype.toString.call(result) === '[object Object]';
const isValidValue = (val: unknown): boolean => {
    if (val === null || baseTypeOf.has(typeof val)) {
        return true;
    }
    if (Array.isArray(val)) {
        return val.every(isValidValue);
    }
    if (isValidObject(val)) {
        return Object.values(val).every(isValidValue);
    }
    return false;
};
const upsertObject = (
    oldData: Record<string, unknown>,
    update: Record<string, unknown>,
    path: string = '',
    logger?: Logger
) => {
    if (!isValidObject(oldData) || !isValidObject(update)) {
        return;
    }
    for (const [key, updateVal] of Object.entries(update)) {
        if (key in Object.prototype) {
            continue;
        }
        const updateDataPath = path ? `${path}.${key}` : key;

        if (!isValidValue(updateVal)) {
            logger?.warn(`invalid socket attribute [${updateDataPath}] value: ${JSON.stringify(updateVal)}, ignored!`);
            continue;
        }

        const keyExists = Object.prototype.hasOwnProperty.call(oldData, key);

        if (
            !keyExists ||
            updateVal === null ||
            baseTypeOf.has(typeof updateVal) ||
            Array.isArray(updateVal)
        ) {
            Object.defineProperty(oldData, key, {
                value: updateVal,
                writable: true,
                enumerable: true,
                configurable: true,
            });
            continue;
        }

        if (isValidObject(updateVal)) {
            if (!isValidObject(oldData[key])) {
                Object.defineProperty(oldData, key, {
                    value: updateVal,
                    writable: true,
                    enumerable: true,
                    configurable: true,
                });
            } else {
                upsertObject(
                    oldData[key] as Record<string, unknown>,
                    updateVal,
                    updateDataPath,
                    logger
                );
            }
        }

    }
};
const processRequest = async (socket: Socket.Link<AnyObject, string>, serverId: string, data: { jsonrpc: '2.0', method: string, id: string | number, params?: unknown }) => {
    const { id, method, params } = data;

    if (socket.logger) {
        socket.logger(`request:${method}`).debug(socket.option.jsonSerializer.serialize(data));
    }

    // ====================================== 特殊method处理 ======================================
    if (method === 'ping') {
        socket.sendout({
            id,
            method,
            result: 'pong'
        });
        _serverStore[serverId]?.requestIds.delete(id);
        return;
    } else if (method === 'connect') {
        socket.sendout({ id, method, result: { msg: 'connected', session: socket.id } });
        _serverStore[serverId]?.requestIds.delete(id);
        return;
    }

    // ====================================== method是否存在 ======================================
    if (!_serverStore[serverId]?.methods[method]) {
        if (socket.logger) {
            socket.logger(`request:${method}`).error(`Method not found with ${socket.option.jsonSerializer.serialize(data)}`);
        }
        socket.sendout({
            id,
            method,
            error: {
                code: -32601,
                message: 'Method not found',
                data: 'Method not found'
            }
        });
        _serverStore[serverId]?.requestIds.delete(id);
        return;
    }

    // ====================================== 执行中间件 ======================================
    const cbSocket = socket as unknown as Socket.Link<Partial<AnyObject>, string>;

    for (const middleware of _serverStore[serverId].middlewares) {
        try {
            const result = middleware.type === 'global' ?
                await middleware.fn(params, cbSocket, method) :
                middleware.type === 'scoped' && method === middleware.method ?
                    await middleware.fn(params, cbSocket, method) : null;

            if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
                upsertObject(socket.attribute, result as Record<string, unknown>, '', socket.logger ? socket.logger(`middleware:${method}`) : undefined);
            }
        } catch (error) {
            if (socket.logger) {
                socket.logger(`middleware:${method}`).error(socket.option.jsonSerializer.serialize(error));
            }
            if (getErrorFns(serverId).length > 0) {
                await executeErrorFns(error, socket, serverId, data);
            } else {
                socket.sendout({
                    id,
                    method,
                    error: {
                        code: -32001,
                        message: 'Method Request failed',
                        data: error
                    }
                });
            }
            _serverStore[serverId]?.requestIds.delete(id);
            return;
        }
    }

    // ====================================== 执行method ======================================
    try {
        socket.sendout({
            id,
            method,
            result: await _serverStore[serverId].methods[method](params, socket)
        });
    } catch (error) {
        if (socket.logger) {
            socket.logger(`method:${method}`).error(socket.option.jsonSerializer.serialize(error));
        }
        if (getErrorFns(serverId).length > 0) {
            await executeErrorFns(error, socket, serverId, data);
        } else {
            socket.sendout({
                id,
                method,
                error: {
                    code: -32001,
                    message: 'Method Request failed',
                    data: error
                }
            });
        }
    }
    _serverStore[serverId]?.requestIds.delete(id);
};

export default (socket: Socket.Link<AnyObject, string>, serverId: string): void => {
    socket.on('message', async parameter => {
        // ====================================== 数据格式化 ======================================
        let data = null;

        try {
            data = socket.option.jsonSerializer.deserialize(parameter.toString());
        } catch (error) {
            if (socket.logger) {
                socket.logger('socket-receive').error(`Parse error with ${parameter.toString()}`);
            }

            return socket.sendout({
                id: null,
                error: {
                    code: -32700,
                    message: 'Parse error',
                    data: (error as Error).message
                }
            });
        }

        const _datas = data as Socket.MethodRequest | Array<Socket.MethodRequest>;
        const datas = Array.isArray(_datas) ? _datas : [_datas];

        if (datas.length === 0) {
            if (socket.logger) {
                socket.logger('socket-receive').error(`Invalid request with ${socket.option.jsonSerializer.serialize(data)}`);
            }

            socket.sendout({
                error: {
                    code: -32600,
                    message: 'Invalid request',
                    data: 'Invalid request: []'
                }
            });
            return;
        }

        for (const data of datas) {
            // ====================================== 数据合法性检查 ======================================
            const { jsonrpc, method, id, params } = data;

            if (jsonrpc !== '2.0') {
                if (socket.logger) {
                    socket.logger('socket-receive').error(`Invalid request with ${socket.option.jsonSerializer.serialize(data)}`);
                }

                socket.sendout({
                    id: id ?? null,
                    method,
                    error: {
                        code: -32600,
                        message: 'Invalid request',
                        data: `Invalid field[jsonrpc]: ${jsonrpc}`
                    }
                });
                continue;
            }

            if (!(method && typeof method === 'string')) {
                if (socket.logger) {
                    socket.logger('socket-receive').error(`Invalid request with ${socket.option.jsonSerializer.serialize(data)}`);
                }

                socket.sendout({
                    id: id ?? null,
                    method,
                    error: {
                        code: -32600,
                        message: 'Invalid request',
                        data: `Invalid field[method]: ${socket.option.jsonSerializer.serialize(method)}`
                    }
                });
                continue;
            }

            if (
                typeof id === 'number' && (isNaN(id) || id.toString().includes('.'))
                || (
                    typeof id !== 'undefined'
                    && typeof id !== 'number'
                    && typeof id !== 'string'
                    && id !== null
                )
            ) {
                if (socket.logger) {
                    socket.logger('socket-receive').error(`Invalid request with ${socket.option.jsonSerializer.serialize(data)}`);
                }

                socket.sendout({
                    id,
                    method,
                    error: {
                        code: -32600,
                        message: 'Invalid request',
                        data: `Invalid field[id]: ${socket.option.jsonSerializer.serialize(id)}`
                    }
                });
                continue;
            }

            if (id === null) {
                if (socket.logger) {
                    socket.logger('socket-receive').error('Invalid request with id: null');
                }
                socket.sendout({
                    id,
                    method,
                    error: {
                        code: -32600,
                        message: 'Invalid request',
                        data: 'Invalid field[id]: null'
                    }
                });
                continue;
            }

            if (typeof id === 'undefined') {
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
                            if (socket.logger) {
                                socket.logger(`notice:${method}`).error(socket.option.jsonSerializer.serialize(error));
                            }
                            if (getErrorFns(serverId).length > 0) {
                                await executeErrorFns(error, socket, serverId, data);
                            }
                        }
                    }
                }
                continue;
            }

            if (typeof _serverStore[serverId]?.requestIds.get(id) !== 'undefined') {
                if (socket.logger) {
                    socket.logger('socket-receive').error(`duplicate request with ${parameter.toString()}`);
                }
                socket.sendout({
                    id,
                    method,
                    error: {
                        code: -32600,
                        message: 'Invalid Request',
                        data: `Duplicate request id: ${id}`
                    }
                });
                continue;
            }

            _serverStore[serverId]?.requestIds.set(id, Date.now());
            // ====================================== 执行 ======================================
            processRequest(socket, serverId, data as Socket.MethodRequest & { id: string | number });
        }
    });
};
