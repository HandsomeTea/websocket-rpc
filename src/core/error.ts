import type { Socket, AnyObject } from '../typings.js';

export default (socket: Socket.Link<AnyObject, string>): void => {
    socket.on('error', err => {
        if (socket.logger) {
            socket.logger('socket-error').error(err.message);
        }
    });
};
