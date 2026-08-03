import type { Socket, AnyObject } from '../typings.js';

export default (socket: Socket.Link<AnyObject>): void => {
    socket.on('error', err => {
        if (socket.option.logger) {
            socket.option.logger('socket-error').error(err.message);
        }
    });
};
