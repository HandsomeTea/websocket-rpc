import err from './error';
import close from './close';
import sendout from './sendout';
import recieve from './recieve';
import attr from './attr';
import { Socket } from '../typings';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (socket: Socket.Link<Record<string, any>>): void => {
    err(socket);
    sendout(socket);
    attr(socket);
    close(socket);
    recieve(socket);
};
