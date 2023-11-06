import zlib from 'zlib';
import { MethodResult, Socket } from '../typings';

export default (socket: Socket): void => {
    socket.sendout = (message: Omit<MethodResult, 'jsonrpc'>) => {
        if (typeof message.error === 'undefined' && typeof message.result === 'undefined') {
            return;
        }
        const msg: MethodResult = {
            jsonrpc: '2.0',
            id: message.id,
            method: message.method || ''
        };

        if (typeof message.error !== 'undefined') {
            msg.error = {
                code: message.error.code || -32000,
                message: message.error.message || 'Unknown Error',
                data: message.error.data || ''
            };
        } else if (typeof message.result !== 'undefined') {
            msg.result = message.result || '';
        }
        const sendJson = JSON.stringify(msg);
        const logger = socket.option.logger;

        if (socket.option.compression === 'zlib') {
            if (logger) {
                const logJson = JSON.stringify(msg, null, '   ');

                logger(message.method ? `compressed-response:${message.method}` : 'compressed-response').trace(logJson);
            }

            return socket.send(zlib.deflateSync(sendJson));
        }
        if (logger) {
            const logJson = JSON.stringify(msg, null, '   ');

            logger(message.method ? `response:${message.method}` : 'response').trace(logJson);
        }
        return socket.send(sendJson);
    };
};
