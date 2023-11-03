import { Socket } from '../websocket';

export default (socket: Socket): void => {
    socket.on('message', async parameter => {
        // ====================================== 数据格式化 ======================================
        let data = null;

        try {
            data = JSON.parse(parameter.toString());
        } catch (e) {
            if (socket.option.logger) {
                socket.option.logger('socket-recieve').error(`Parse error with ${parameter.toString()}`);
            }
            return socket.sendByCompress({
                jsonrpc: '2.0',
                id: new Date().getTime(),
                error: {
                    code: -32700,
                    message: 'Parse error',
                    data: parameter.toString()
                }
            }, '');
        }

        // ====================================== 数据和发行检查 ======================================
        const { jsonrpc, id, method, params } = data as { jsonrpc: '2.0', method: string, id: string | number, params?: unknown };

        if (!(jsonrpc === '2.0' && method && typeof method === 'string' && id && (typeof id === 'string' || typeof id === 'number'))) {
            if (socket.option.logger) {
                socket.option.logger('socket-recieve').error(`Invalid Request with ${parameter.toString()}`);
            }
            return socket.sendByCompress({
                jsonrpc: '2.0',
                id: id || new Date().getTime(),
                error: {
                    code: -32600,
                    message: 'Invalid Request',
                    data: parameter.toString()
                }
            }, '');
        }

        if (socket.option.logger) {
            socket.option.logger(`request:${method}`).debug(JSON.stringify(data, null, '   '));
        }

        // ====================================== 特殊method处理 ======================================
        if (method === 'ping') {
            return socket.sendByCompress({
                jsonrpc: '2.0',
                id,
                result: 'pong'
            }, method);
        } else if (method === 'connect') {
            return socket.sendByCompress({ jsonrpc: '2.0', id, result: { msg: 'connected', session: socket.connection.id } }, method);
        }

        // ====================================== method是否存在 ======================================
        if (!global._WebsocketServer.methods[method]) {
            if (socket.option.logger) {
                socket.option.logger(`request:${method}`).error(`Method not found with ${parameter.toString()}`);
            }
            return socket.sendByCompress({
                jsonrpc: '2.0',
                id,
                error: {
                    code: -32601,
                    message: 'Method not found',
                    data: parameter.toString()
                }
            }, '');
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
                    socket.option.logger(`middleware:${method}`).error((error as Error).message);
                }
                return socket.sendByCompress({
                    jsonrpc: '2.0',
                    id,
                    error: {
                        code: -32001,
                        message: 'Method Request failed',
                        data: error
                    }
                }, method);
            }
        }

        // ====================================== 执行method ======================================
        try {
            const result = await global._WebsocketServer.methods[method](params, socket);

            return socket.sendByCompress({
                jsonrpc: '2.0',
                id,
                result: result || ''
            }, method);
        } catch (error) {
            if (socket.option.logger) {
                socket.option.logger(`method:${method}`).error((error as Error).message);
            }
            return socket.sendByCompress({
                jsonrpc: '2.0',
                id,
                error: {
                    code: -32001,
                    message: 'Method Request failed',
                    data: error
                }
            }, method);
        }
    });
};
