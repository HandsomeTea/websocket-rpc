/* eslint-disable no-console */

// simple example import
import './simple-server/simple-server';
import server from './simple-server/websocket';


console.log(`示例代码所在: ${__filename} \n`);

// http example import
// import './http-server/http-server';
// import server from './http-server/websocket';

// express exampme import
// import './express-server/express-server';
// import server from './express-server/websocket';


import client from './client/common';

server.register('hello', (params, socket) => {
	console.log('server debug', '收到method hello，请求参数为', params);

	return {
		attr: socket.getAttr(),
		res: 'Hello World'
	};
});

server.register('hello2', (params) => {
	console.log('server debug', '收到method hello2，请求参数为', params);

	return {
		res: 'Hello World2'
	};
});

server.use('hello', () => console.log('server debug 1', '为method: hello注册的中间件收到了hello请求'));

server.use((_p, _s, method) => {
	console.log('server debug 2', `为所有method注册的中间件收到了method: ${method}请求`);

	return {
		userId: 'xxxxxxx'
	};
});

const test = async () => {
	await client.open();

	console.log('client method hello收到结果', await client.request('hello', { des: 'method hello data' }));
	console.log('client method hello2收到结果', await client.request('hello2', { des: 'method hello2 data' }));
};

test();
