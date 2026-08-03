import err from './error.js';
import close from './close.js';
import sendout from './sendout.js';
import recieve from './receive.js';
import attr from './attr.js';
import type { Socket, AnyObject } from '../typings.js';

export default (socket: Socket.Link<AnyObject>, serverId: string): void => {
    err(socket);
    sendout(socket);
    attr(socket);
    close(socket, serverId);
    recieve(socket, serverId);
};
