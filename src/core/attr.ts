import { Socket } from '../typings';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (socket: Socket<Record<string, any>>): void => {
    socket.setAttr = (attribute, value) => {
        if (typeof attribute === 'string' && typeof value !== 'undefined') {
            socket.attribute[attribute] = value;
        } else if (typeof attribute === 'object' && !Array.isArray(attribute)) {
            Object.assign(socket.attribute, attribute);
        }
    };

    socket.getAttr = (attribute) => {
        if (typeof attribute === 'string') {
            return socket.attribute[attribute];
        } else {
            return socket.attribute;
        }
    };
};
