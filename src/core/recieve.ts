import { Socket } from '../typings';

export default (socket: Socket): void => {
    socket.on('message', async parameter => {
        // ====================================== 数据格式化 ======================================
        let data = null;

        try {
            data = JSON.parse(parameter.toString());
        } catch (error) {
            if (socket.option.logger) {
                socket.option.logger('socket-recieve').error(`Parse error with ${parameter.toString()}`);
            }
            if (socket.error) {
                return socket.error(error as Error, socket);
            } else {
                return socket.sendout({
                    id: new Date().getTime(),
                    method: '',
                    error: {
                        code: -32700,
                        message: 'Parse error',
                        data: (error as Error).message
                    }
                });
            }
        }

        // ====================================== 数据合法性检查 ======================================
        const { jsonrpc, id, method, params } = data as { jsonrpc: '2.0', method: string, id: string | number, params?: unknown };

        if (!(jsonrpc === '2.0' && method && typeof method === 'string' && id && (typeof id === 'string' || typeof id === 'number'))) {
            if (socket.option.logger) {
                socket.option.logger('socket-recieve').error(`Invalid params with ${parameter.toString()}`);
            }
            if (socket.error) {
                return socket.error(new Error('Invalid field: jsonrpc/method/id'), socket);
            } else {
                return socket.sendout({
                    id: id || new Date().getTime(),
                    method: method || '',
                    error: {
                        code: -32602,
                        message: 'Invalid params',
                        data: 'Invalid field: jsonrpc/method/id'
                    }
                });
            }
        }

        if (socket.option.logger) {
            socket.option.logger(`request:${method}`).debug(JSON.stringify(data, null, '   '));
        }

        // ====================================== 特殊method处理 ======================================
        if (method === 'ping') {
            return socket.sendout({
                id,
                method,
                result: 'pong'
            });
        } else if (method === 'connect') {
            return socket.sendout({ id, method, result: { msg: 'connected', session: socket.connection.id } });
        }

        // ====================================== method是否存在 ======================================
        if (!global._WebsocketServer.methods[method]) {
            if (socket.option.logger) {
                socket.option.logger(`request:${method}`).error(`Method not found with ${parameter.toString()}`);
            }
            if (socket.error) {
                return socket.error(new Error('Method not found'), socket);
            } else {
                return socket.sendout({
                    id,
                    method,
                    error: {
                        code: -32601,
                        message: 'Method not found',
                        data: 'Method not found'
                    }
                });
            }
        }

        // ====================================== 执行中间件 ======================================
        for (const middleware of global._WebsocketServer.middlewares) {
            try {
                const result = typeof middleware === 'function' ?
                    await middleware(params, socket, method) :
                    typeof middleware[method] === 'function' ?
                        await middleware[method](params, socket, method) : null;

                if (result) {
                    socket.attempt = {
                        ...socket.attempt,
                        ...result
                    };
                }
            } catch (error) {
                if (socket.option.logger) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    socket.option.logger(`middleware:${method}`).error(error);
                }
                if (socket.error) {
                    return socket.error(error as Error, socket);
                } else {
                    return socket.sendout({
                        id,
                        method,
                        error: {
                            code: -32001,
                            message: 'Method Request failed',
                            data: (error as Error).message
                        }
                    });
                }
            }
        }

        // ====================================== 执行method ======================================
        try {
            const result = await global._WebsocketServer.methods[method](params, socket);

            return socket.sendout({
                id,
                method,
                result: result || ''
            });
        } catch (error) {
            if (socket.option.logger) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                socket.option.logger(`method:${method}`).error(error);
            }
            if (socket.error) {
                return socket.error(error as Error, socket);
            } else {
                return socket.sendout({
                    id,
                    method,
                    error: {
                        code: -32001,
                        message: 'Method Request failed',
                        data: (error as Error).message
                    }
                });
            }
        }
    });
};
