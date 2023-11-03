import zlib from 'zlib';
import { MethodResult, Socket } from '../websocket';

export default (socket: Socket): void => {
    socket.sendByCompress = (message: MethodResult, action: string) => {
        if (!message) {
            return;
        }
        const sendJson = JSON.stringify(message);
        const logJson = JSON.stringify(message, null, '   ');
        const logger = socket.option.logger;

        if (socket.option.compression === 'zlib') {
            if (logger) {
                logger(`compressed-response:[${action}]`).trace(logJson);
            }

            return socket.send(zlib.deflateSync(sendJson));
        }
        if (logger) {
            logger(`string-response:[${action}]`).trace(logJson);
        }
        return socket.send(sendJson);
    };
};
