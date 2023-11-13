/* eslint-disable no-console */

// simple example import
import './simple-server/simple-server';
import server from './simple-server/websocket';
import client from './client/common';

// http example import
// import './http-server/http-server';
// import server from './http-server/websocket';
// import client from './client/common';

// express exampme import
// import './express-server/express-server';
// import client from './client/common';
// import server from './express-server/websocket';

server.register('hello', (params, socket) => {
    console.log(3, params);

    return {
        attr: socket.getAttr(),
        res: 'Hello World'
    };
});

server.use('hello', () => console.log(1, 'get method: hello'));

server.use(() => {
    console.log(2, 'get request');

    return {
        userId: 'xxxxxxx'
    };
});

client.on('open', () => {
    const data = {
        jsonrpc: '2.0',
        id: new Date().getTime(),
        method: 'hello',
        params: {
            des: 'connection is open!'
        }
    };

    client.send(JSON.stringify(data));
});

client.on('message', res => {
    const result = JSON.parse(res.toString());

    console.log(result);
});
