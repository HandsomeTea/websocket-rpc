import WebSocket from 'ws';
import type { Socket, AnyObject } from '../typings.js';
import { uuid } from '../lib.js';

export default (socket: Socket.Link<AnyObject>): void => {

    // @ts-ignore
    socket.sendout = async (message: Omit<Socket.ServerMessage, 'jsonrpc' | 'id'> & { id?: Socket.ServerMessage['id'] }) => {
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
};
