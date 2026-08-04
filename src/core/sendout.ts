import zlib from 'zlib';
import WebSocket from 'ws';
import type { Socket, AnyObject } from '../typings.js';

export default (socket: Socket.Link<AnyObject>): void => {

    // @ts-ignore
    socket.sendout = (message: Omit<Socket.MethodResponse, 'jsonrpc'>) => {
        if (socket.readyState !== WebSocket.OPEN) {
            return;
        }
        if (typeof message.error === 'undefined' && typeof message.result === 'undefined') {
            return;
        }
        const msg: Socket.MethodResponse = {
            jsonrpc: '2.0',
            id: message.id,
            method: message.method || `method-${message.id}`
        };

        if (typeof message.error !== 'undefined') {
            msg.error = {
                code: message.error.code || -32000,
                message: message.error.message || 'Unknown Error',
                data: message.error.data || ''
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

            return socket.send(zlib.deflateSync(sendJson));
        }
        if (logger) {
            const logJson = socket.option.RPCSerializer.serialize(msg);

            logger(message.method ? `response:${message.method}` : 'response').trace(logJson);
        }
        return socket.send(sendJson);
    };
};
