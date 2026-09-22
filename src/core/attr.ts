import type { Socket, AnyObject } from '../typings.js';

export default (socket: Socket.Link<AnyObject, string>): void => {

    const setAttr = ((attribute, value) => {
        if (typeof attribute === 'string' && typeof value !== 'undefined') {
            socket.attribute[attribute] = value;
        } else if (attribute && typeof attribute === 'object' && !Array.isArray(attribute)) {
            Object.assign(socket.attribute, attribute);
        }
    }) as Socket.Link<AnyObject, string>['setAttr'];

    (socket as { setAttr: typeof setAttr }).setAttr = setAttr;

    const getAttr = ((...attribute: Array<string>) => {
        if (attribute.length === 0) {
            return socket.attribute;
        } else if (attribute.length === 1 && typeof attribute[0] === 'string') {
            return socket.attribute[attribute[0]];
        } else if (attribute.length > 1) {
            return Object.assign({}, ...attribute.map(a => ({ [a]: socket.attribute[a] })));
        }
    }) as Socket.Link<AnyObject, string>['getAttr'];

    (socket as { getAttr: typeof getAttr }).getAttr = getAttr;

    const removeAttr: Socket.Link<AnyObject, string>['removeAttr'] = (...attributes) => {
        for (const attr of attributes) {
            delete socket.attribute[attr];
        }
    };

    (socket as { removeAttr: typeof removeAttr }).removeAttr = removeAttr;
};
