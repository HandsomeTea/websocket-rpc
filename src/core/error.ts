import { Socket } from '../typings';

export default (socket: Socket): void => {
    socket.on('error', err => {
        if (socket.option.logger) {
            socket.option.logger('socket-error').error(err.message);
        }
    });
};
