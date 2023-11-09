import { Socket } from '../typings';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (socket: Socket.Link<Record<string, any>>): void => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    socket.setAttr = (attribute, value) => {
        if (typeof attribute === 'string' && typeof value !== 'undefined') {
            socket.attribute[attribute] = value;
        } else if (typeof attribute === 'object' && !Array.isArray(attribute)) {
            Object.assign(socket.attribute, attribute);
        }
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    socket.getAttr = (attribute) => {
        if (typeof attribute === 'string') {
            return socket.attribute[attribute];
        } else {
            return socket.attribute;
        }
    };
};
