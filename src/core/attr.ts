import type { Socket, AnyObject } from '../typings.js';

export default (socket: Socket.Link<AnyObject>): void => {

    // @ts-ignore
    socket.setAttr = (attribute, value) => {
        if (typeof attribute === 'string' && typeof value !== 'undefined') {
            socket.attribute[attribute] = value;
        } else if (attribute && typeof attribute === 'object' && !Array.isArray(attribute)) {
            Object.assign(socket.attribute, attribute);
        }
    };

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
