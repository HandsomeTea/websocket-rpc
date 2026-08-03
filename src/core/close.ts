import type { Socket, AnyObject } from '../typings.js';

export default (socket: Socket.Link<AnyObject>, serverId: string): void => {
    socket.on('close', async () => {
        const { id } = socket;

        if (socket.option.logger) {
            socket.option.logger('close-socket-connection').warn(`socket:${id} is closed.`);
        }

        const offlineFns = global._WebsocketServer[serverId]?.offlineCallbacks || [];

        if (offlineFns.length > 0) {
            try {
                for (const fn of offlineFns) {
                    await fn(socket.attribute, socket.id);
                }
            } catch (error) {
                if (socket.option.logger) {
                    const e = error as Error;

                    socket.option.logger('close-socket-connection').error(e.stack || e.message);
                }
                const errorFns = global._WebsocketServer[serverId]?.errorCallbacks || [];

                if (errorFns.length > 0) {
                    for (const fn of errorFns) {
                        // @ts-ignore
                        await fn(error as Error, socket);
                    }
                }
            }
        }

        if (global._sessionMap[id]) {
            delete global._sessionMap[id];
        }
    });
};
