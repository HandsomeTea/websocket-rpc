import zlib from 'zlib';
import { promisify } from 'util';
import WebSocket from 'ws';
import type { Socket, AnyObject } from '../typings.js';

export default (socket: Socket.Link<AnyObject>): void => {

    // @ts-ignore
    socket.sendout = async (message: Omit<Socket.MethodResponse, 'jsonrpc'>) => {
        if (socket.readyState !== WebSocket.OPEN) {
            return;
        }

        const msg: Socket.MethodResponse = {
            jsonrpc: '2.0',
            id: message.id,
            method: message.method
        };

        if (typeof message.error !== 'undefined') {
            msg.error = {
                code: message.error.code ?? -32000,
                message: message.error.message ?? 'Unknown Error',
                data: message.error.data
            };
        } else {
            msg.result = message.result;
        }
        const sendJson = socket.option.RPCSerializer.serialize(msg);
        const logger = socket.option.logger;

        if (socket.option.compression === 'zlib') {
            if (logger) {
                const logJson = socket.option.RPCSerializer.serialize(msg);

                logger(message.method ? `compressed-response:${message.method}` : 'compressed-response').trace(logJson);
            }
            const deflateAsync = promisify(zlib.deflate);

            return socket.send(await deflateAsync(sendJson, {
                level: zlib.constants.Z_BEST_SPEED
            }));
        }
        if (logger) {
            const logJson = socket.option.RPCSerializer.serialize(msg);

            logger(message.method ? `response:${message.method}` : 'response').trace(logJson);
        }
        return socket.send(sendJson);
    };
};
