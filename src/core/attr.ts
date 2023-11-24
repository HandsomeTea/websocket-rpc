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
    socket.getAttr = (...attribute) => {
        if (attribute.length === 0) {
            return socket.attribute;
        } else if (attribute.length === 1 && typeof attribute[0] === 'string') {
            return socket.attribute[attribute[0]];
        } else if (attribute.length > 1) {
            return Object.assign({}, ...attribute.map(a => ({ [a]: socket.attribute[a] })));
        }
    };
};
