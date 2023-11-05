import zlib from 'zlib';
import { MethodResult, Socket } from '../websocket';

export default (socket: Socket): void => {
    socket.sendByCompress = (message: MethodResult, action?: string) => {
        if (!message) {
            return;
        }
        const sendJson = JSON.stringify(message);
        const logger = socket.option.logger;

        if (socket.option.compression === 'zlib') {
            if (logger) {
                const logJson = JSON.stringify(message, null, '   ');

                logger(action ? `compressed-response:${action}` : 'compressed-response').trace(logJson);
            }

            return socket.send(zlib.deflateSync(sendJson));
        }
        if (logger) {
            const logJson = JSON.stringify(message, null, '   ');

            logger(action ? `response:${action}` : 'response').trace(logJson);
        }
        return socket.send(sendJson);
    };
};
