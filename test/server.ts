import { WebsocketServer } from '../src/websocket';
// import { createServer } from 'http';
// const http = createServer();

// http.on('request', (_req, res) => {
//     res.statusCode = 403;
//     res.write('There is nothing for you, bye!');
//     res.end();
// });

const server = new WebsocketServer({ log: true, port: 3303 });

// server.use('login', () => {
//     return 'ok';
// });
// server.method({
//     login: () => {
//         return 'ok';
//     }
// });
// server.middleware(() => {
//     return { result: 'ok' };
// });
// server.setMiddleware('login', () => {
//     return { result: 'ok' };
// });
// server.receive();

// http.listen(3303, () => {
//     console.log('start up!');
// });

// export default http;
export default server;
