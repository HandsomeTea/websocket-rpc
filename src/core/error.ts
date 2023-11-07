import { Socket } from '../typings';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (socket: Socket<Record<string, any>>): void => {
    socket.on('error', err => {
        if (socket.option.logger) {
            socket.option.logger('socket-error').error(err.message);
        }
    });
};
