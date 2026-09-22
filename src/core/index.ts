import error from './error.js';
import close from './close.js';
import sendout from './sendout.js';
import receive from './receive.js';
import attr from './attr.js';
import type { Socket, AnyObject } from '../typings.js';

export default (socket: Socket.Link<AnyObject, string>, serverId: string): void => {
    error(socket);
    sendout(socket);
    attr(socket);
    close(socket, serverId);
    receive(socket, serverId);
};
