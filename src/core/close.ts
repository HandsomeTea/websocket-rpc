import { Socket } from '../websocket';


export default (socket: Socket): void => {
    socket.on('close', () => {
        const { connection: { id } } = socket;

        if (global._WebsocketServer.sessionMap[id]) {
            delete global._WebsocketServer.sessionMap[id];
        }

        if (socket.option.logger) {
            socket.option.logger('close-socket-connection').warn(`socket:${id} is closed.`);
        }

        if (socket.offline) {
            socket.offline(socket.attempt, socket.connection);
        }
    });
};
