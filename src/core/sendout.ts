import WebSocket from 'ws';
import type { Socket, AnyObject } from '../typings.js';
import { uuid } from '../lib.js';

export default (socket: Socket.Link<AnyObject, string>): void => {

    const sendout: Socket.Link<AnyObject, string>['sendout'] = async message => {
        if (socket.readyState !== WebSocket.OPEN) {
            return;
        }
        const logger = socket.logger;

        if (message.method === 'unknownMsg') {
            if (logger) {
                logger('sendout').warn('Sending messages with the \'method\' field set to \'unknownMsg\' is not allowed.');
            }
            return;
        }

        const msg: Socket.ServerMessage = {
            jsonrpc: '2.0',
            id: typeof message.id === 'undefined' ? uuid() : message.id,
            method: message.method,
            ...typeof message.error !== 'undefined' ? {
                error: {
                    code: message.error.code ?? -32000,
                    message: message.error.message ?? 'Unknown Error',
                    data: message.error.data
                }
            } : {
                result: typeof message.result === 'undefined' ? null : message.result
            }
        };
        const sendJson = socket.option.jsonSerializer.serialize(msg);

        if (logger) {
            const logJson = socket.option.jsonSerializer.serialize(msg);

            logger(message.method ? `response:${message.method}` : 'response').debug(logJson);
        }
        await new Promise((resolve, reject) => {
            try {
                socket.send(sendJson);
                resolve(true);
            } catch (e) {
                reject(e);
            }
        });
    };

    (socket as { sendout: typeof sendout }).sendout = sendout;
};
