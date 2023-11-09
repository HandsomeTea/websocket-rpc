import { Socket } from '../typings';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (socket: Socket.Link<Record<string, any>>): void => {
    socket.on('close', async () => {
        const { id } = socket;

        if (global._WebsocketServer.sessionMap[id]) {
            delete global._WebsocketServer.sessionMap[id];
        }

        if (socket.option.logger) {
            socket.option.logger('close-socket-connection').warn(`socket:${id} is closed.`);
        }

        if (socket.offline.length > 0) {
            try {
                for (const fn of socket.offline) {
                    await fn(socket.attribute, socket.id);
                }
            } catch (error) {
                if (socket.option.logger) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    socket.option.logger('close-socket-connection').error(error);
                }
            }
        }
    });
};
