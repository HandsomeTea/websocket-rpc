import type { Socket, AnyObject } from '../typings.js';
import { _sessionMap, _serverStore } from '../global.js';

export default (socket: Socket.Link<AnyObject, string>, serverId: string): void => {
    socket.on('close', async () => {
        const { id } = socket;

        if (socket.logger) {
            socket.logger('close-socket-connection').warn(`socket:${id} is closed.`);
        }

        const offlineFns = _serverStore[serverId]?.offlineCallbacks || [];

        if (offlineFns.length > 0) {
            const cbSocket = socket as unknown as Socket.Link<Partial<AnyObject>, string>;

            for (const fn of offlineFns) {
                try {
                    await fn(socket.attribute, socket.id);
                } catch (error) {
                    if (socket.logger) {
                        const e = error as Error;

                        socket.logger('close-socket-connection').error(e.stack || e.message);
                    }
                    const errorFns = _serverStore[serverId]?.errorCallbacks || [];

                    if (errorFns.length > 0) {
                        for (const fn of errorFns) {
                            await fn(error as Error, cbSocket);
                        }
                    }
                }
            }
        }

        if (_sessionMap[id]) {
            delete _sessionMap[id];
        }
    });
};
