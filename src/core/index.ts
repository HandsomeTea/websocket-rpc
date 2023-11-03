import err from './error';
import close from './close';
import sendByConfig from './compression';
import recieve from './recieve';
import { Socket } from '../websocket';

export default (socket: Socket): void => {
    err(socket);
    sendByConfig(socket);
    close(socket);
    recieve(socket);
};
