import err from './error';
import close from './close';
import sendout from './sendout';
import recieve from './recieve';
import { Socket } from '../typings';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (socket: Socket<Record<string, any>>): void => {
    err(socket);
    sendout(socket);
    close(socket);
    recieve(socket);
};
