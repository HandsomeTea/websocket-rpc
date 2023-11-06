import err from './error';
import close from './close';
import sendout from './sendout';
import recieve from './recieve';
import { Socket } from '../typings';

export default (socket: Socket): void => {
    err(socket);
    sendout(socket);
    close(socket);
    recieve(socket);
};
