<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [这是什么？](#%E8%BF%99%E6%98%AF%E4%BB%80%E4%B9%88)
  - [为什么要做](#%E4%B8%BA%E4%BB%80%E4%B9%88%E8%A6%81%E5%81%9A)
- [快速开始](#%E5%BF%AB%E9%80%9F%E5%BC%80%E5%A7%8B)
  - [安装](#%E5%AE%89%E8%A3%85)
  - [示例代码](#%E7%A4%BA%E4%BE%8B%E4%BB%A3%E7%A0%81)
- [服务端](#%E6%9C%8D%E5%8A%A1%E7%AB%AF)
  - [method](#method)
    - [内置method](#%E5%86%85%E7%BD%AEmethod)
  - [中间件](#%E4%B8%AD%E9%97%B4%E4%BB%B6)
  - [socket属性](#socket%E5%B1%9E%E6%80%A7)
    - [属性的设置](#%E5%B1%9E%E6%80%A7%E7%9A%84%E8%AE%BE%E7%BD%AE)
    - [属性的获取](#%E5%B1%9E%E6%80%A7%E7%9A%84%E8%8E%B7%E5%8F%96)
  - [server对象](#server%E5%AF%B9%E8%B1%A1)
    - [获取连接](#%E8%8E%B7%E5%8F%96%E8%BF%9E%E6%8E%A5)
    - [获取连接属性](#%E8%8E%B7%E5%8F%96%E8%BF%9E%E6%8E%A5%E5%B1%9E%E6%80%A7)
    - [设置连接属性](#%E8%AE%BE%E7%BD%AE%E8%BF%9E%E6%8E%A5%E5%B1%9E%E6%80%A7)
  - [回调](#%E5%9B%9E%E8%B0%83)
    - [server.online](#serveronline)
    - [server.offline](#serveroffline)
    - [server.error](#servererror)
  - [扩展配置](#%E6%89%A9%E5%B1%95%E9%85%8D%E7%BD%AE)
- [客户端](#%E5%AE%A2%E6%88%B7%E7%AB%AF)
- [关于ping](#%E5%85%B3%E4%BA%8Eping)
- [其它](#%E5%85%B6%E5%AE%83)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# 这是什么？

这是一个基于[ws](https://www.npmjs.com/package/ws)，遵循[JSON-RPC 2.0](https://wiki.geekdream.com/Specification/json-rpc_2.0.html)协议的websocket应用框架。

## 为什么要做

在传统的websocket使用中，服务器端我们可能会这么做：

```typescript
// ...

const websocketServer = ...;

websocketServer.on('connection',socket => {
    socket.on('message',data=>{
        if(data.xxx === 'xxx'){ // 业务标识判断
            // 具体业务逻辑
        }
        // ...
    });

    socket.on(...)

    // ...
});

// ...
```

这种做法，出现了nodejs开发中极力避免的层层嵌套问题，同时需要对服务器接收到的数据做大量的业务标识判断，开发者需要分出一部分精力来把业务数据分流到对应的业务处理逻辑中，同时对websocket各个时间节点(上线、下线、登录、session等)进行小心维护。

而在客户端我们可能会这么做：

```typescript
// ...

const client = ...;

client.on('open',() =>{
    // ...
};

client.on('message', data => {
    // ...       
});


client.emit('xxx', () => {
    // ...
});


client.on('xxx', () => {
    // ...
});

// ...
```

出现回调嵌套问题的同时，客户端会出现大量对请求响应数据的监听，影响性能和交互体验，也出现了大量的代码冗余，非常不方便开发。

我们希望的服务器端类似于：

```typescript
const websocketServer = ...;


websocketServer.set('某个业务标识', (params, socket) => {
    console.log(params);
    // params 是该业务的请求参数
    socket.send(...);
});


websocketServer.start();
```

没有太多的业务判断，直接可以将精力放到对业务的处理上。同时，我们对客户端的期望如下：

```typescript
const client = ...;


const result = client.request('某个业务标识', [业务参数]);


console.log(result);
// result 是该业务请求的结果
```

不用对业务请求的结果做甄别，不用担心接收到的数据不是该业务的结果，也不用写大量的冗余监听。这就是`@coco-sheng/websocket`想要做的。

`@coco-sheng/websocket`经过了实际项目的检测，在1核CPU1G内存的设备上部署服务器端，能同时维持最多2万个客户端连接，qps在20到30之间(根据业务逻辑的复杂性而定)。

# 快速开始

## 安装

```shell
npm install --save @coco-sheng/websocket
```

## 示例代码

服务端：

```typescript
import { WebsocketServer } from '@coco-sheng/websocket';

interface SocketAttr {
    userId: string;
    role: string;
    type: string
    token: string;
}

const port = 3403;
const server = new WebsocketServer<SocketAttr>({ port });

server.register('hello', () => {
    return 'hello world!';
});

server.start();
```

`SocketAttr`是socket连接上的属性，详见[socket属性](#socket%E5%B1%9E%E6%80%A7)部分。

客户端：

```typescript
import { WebsocketClient } from '@coco-sheng/websocket';

const client = new WebsocketClient('ws://localhost:3403');

await client.open();
const result = await client.request('hello');


console.log(result);
// hello world!
```

# 服务端

## method

定义method(类似于定义一个api)

method.ts

```typescript
import server from './server';


server.register('hello', () => {
    return 'hello world!';
});
```

你也可以同时定义多个method

```typescript
import { MethodFn } from '@coco-sheng/websocket-server';
import server from './server';


server.register({
    hello1() {
        return 'hello world1!';
    },
    hello2() {
        return {
            result: 'hello world2!'
        };
    },
    hello3(){
        console.log('hello world3!');
    }
});


const testMethod: MethodFn<SocketAttr> = () => {
    console.log('test');
};


server.register({ testMethod });
```

client.ts

```typescript
import Websocket from 'ws';

const port = 3403;
const client = new Websocket(`ws://localhost:${port}`);


client.on('open',async ()=>{
    const result1 = await new Promise(resolve => {
        client.send(JSON.stringify({ method: 'hello', id: 1, params: [], jsonrpc: '2.0' }));
        client.once('message', data => resolve(JSON.parse(data.toString())));
    });

    console.log(result1);
    // {
    //     jsonrpc: '2.0',
    //     id: 1,
    //     method: 'hello',
    //     result: 'hello world!'
    // }

    const result2 = await new Promise(resolve => {
        client.send(JSON.stringify({ method: 'hello1', id: 2, params: [], jsonrpc: '2.0' }));
        client.once('message', data => resolve(JSON.parse(data.toString())));
    });

    console.log(result2);
    // {
    //     jsonrpc: '2.0',
    //     id: 2,
    //     method: 'hello1',
    //     result: 'hello world1!'
    // }

    const result3 = await new Promise(resolve => {
        client.send(JSON.stringify({ method: 'hello2', id: 3, params: [], jsonrpc: '2.0' }));
        client.once('message', data => resolve(JSON.parse(data.toString())));
    });

    console.log(result3);
    // {
    //     jsonrpc: '2.0',
    //     id: 3,
    //     method: 'hello2',
    //     result: {
    //         result: 'hello world2!'
    //     }
    // }

    const result4 = await new Promise(resolve => {
        client.send(JSON.stringify({ method: 'hello3', id: 4, params: [], jsonrpc: '2.0' }));
        client.once('message', data => resolve(JSON.parse(data.toString())));
    });

    console.log(result4);
    // {
    //     jsonrpc: '2.0',
    //     id: 4,
    //     method: 'hello3',
    //     result: ''
    // }

    const result5 = await new Promise(resolve => {
        client.send(JSON.stringify({ method: 'testMethod', id: 5, params: [], jsonrpc: '2.0' }));
        client.once('message', data => resolve(JSON.parse(data.toString())));
    });

    console.log(result5);
    // {
    //     jsonrpc: '2.0',
    //     id: 5,
    //     method: 'testMethod',
    //     result: ''
    // }
});
```

主动向客户端发送消息

```typescript
server.register('hello',(_params, socket)=>{
    // _params 为method的请求参数
    socket.sendout({
        method: 'test'
        result: 'pending hello'
    });

    // 或者
    socket.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        result: 'pending hello'
    }));
});
```

`sendout`和`send`的区别在于`sendout`会把要发送的数据转换为符合`jsonrpc2.0`规范的格式，同时也会根据数据压缩配置将数据进行压缩处理；`send`则需要手动组装`jsonrpc2.0`规范的数据，且不会根据配置压缩数据。

### 内置method

系统内置了两个method：`connect`，`ping`

```typescript
client.on('open',async ()=>{
    const result1 = await new Promise(resolve => {
        client.send(JSON.stringify({ method: 'connect', id: 1, params: [], jsonrpc: '2.0' }));
        client.once('message', data => resolve(JSON.parse(data.toString())));
    });

    console.log(result1);
    // {
    //     jsonrpc: '2.0',
    //     id: 1,
    //     method: 'connect',
    //     result: {
    //         msg: 'connected',
    //         session: 'xxxxxxxxxx'
    //     }
    // }

    const result2 = await new Promise(resolve => {
        client.send(JSON.stringify({ method: 'ping', id: 2, params: [], jsonrpc: '2.0' }));
        client.once('message', data => resolve(JSON.parse(data.toString())));
    });

    console.log(result2);
    // {
    //     jsonrpc: '2.0',
    //     id: 2,
    //     method: 'ping',
    //     result: 'pong'
    // }
});
```

> 注意：要中断method函数的执行，可以直接`return`，或者`throw`(你可以throw任何数据，比如数组、Object、Error对象等)，throw抛出的数据会被系统捕获，并封装为一个符合`JSONRPC-2.0`规范的错误数据返回，你也可以定义全局的[错误捕获回调函数](#servererror)，来自行处理`throw`抛出的数据。

## 中间件

中间件是一个在请求到达method之前对请求的数据和业务进行处理的函数。该函数如果返回一个Object，则会将该Object的属性挂载到当前socket连接的属性(后续业务可获取)上；返回其它数据结构则不做任何处理，后续业务逻辑也无法获取该返回值。可以定义针对全部method的一个或多个中间件，也可以为某个method定义一个或多个中间件，中间件的执行顺序为中间件定义的代码逻辑顺序。

middleware.ts，定义全局的中间件：

```typescript
import { MiddlewareFn } from '@coco-sheng/websocket-server';

server.use(()=>{
    console.log('this is a middleware for all methods');
});

const mdw1: MiddlewareFn<SocketAttr> = (_params, socket, method) => {

    if (method !== 'login' && !socket.getAttr('userId')) {
        throw Error('you must login to do this!');
    }

    console.log('middleware 1 for all methods');
};
const mdw2: MiddlewareFn<SocketAttr> = () =>{
    // ...
    return { type: '1' };
};

server.use(mdw1, mdw2, ...);
```

使用`return`结束中间件的执行，只是结束了当前中间件的执行，后续的中间件及method依然会执行，要想在中间件中直接结束整个method的业务逻辑，只能通过`throw`，throw抛出错误的处理逻辑同method，详见[method部分](#method)。

定义针对某个method的中间件。

```typescript
import { MiddlewareFn } from '@coco-sheng/websocket-server';

server.use('login', () => {
    console.log('to login method');

    // ...
    return { role: 'admin' };
    // 将会为当前socket设置一个role的属性，值为admin
});


const checkLoginToken: MiddlewareFn<SocketAttr> = (params, socket) => {
    // ...
};
const checkPermission: MiddlewareFn<SocketAttr> = () => {
    // ...
    throw new Error('you are no permission');
};


server.use('login', checkLoginToken, checkPermission);
```

使用中间件函数的socket参数，也可以在中间件里向客户端主动发送消息。

## socket属性

socket的属性即挂在到当前socket连接上的数据。

### 属性的设置

属性的设置有两种方式，一种是在中间件函数里返回一个Object(详见[中间件](#中间件)部分)，另一种是调用socket对象本身的属性操作函数，如下：

```typescript
// 在method中设置
server.register('hello', (_params, socket) => {
    socket.setAttr('key','value');
    socket.setAttr({
        user: '....',
        role: 'admin'
    });
});


// 在中间件中设置
server.use((_params, socket, method)=>{
    console.log('this is a middleware for all methods');

    const user = {...};
    if(method === 'login' && user.role === 'admin'){
        socket.setAttr('role', 'admin');
        socket.setAttr({
            user: '....',
            type: 'password-login'
        });
    }
});
```

### 属性的获取

获取全部属性

```typescript
const attr = socket.getAttr();

// 全部属性
// {
//     ...   
// }
```

获取某个属性

```typescript
const value = socket.getAttr('key');

// 该属性值
// ...
```

获取某些属性

```typescript
const values = socket.getAttr('key1', 'key2', ...);


// key1,key2,...的属性
// {
//     key1: ...,
//     key2: ...,
//     ...   
// }
```

## server对象

### 获取连接

每一个客户端socket连接都有一个id(这个id通常可以作为socket连接的session标识来使用)，是一个随机生成的字符串，在method和中间件中都可以通过socket获取，以method为例：

```typescript
server.register('hello', (_params, socket) => {
    console.log(socket.id);
});
```

当你知道某个socket连接的id时，可以通过server直接拿到对应的socket对象：

```typescript
const socketId = 'xxxxxxxxx';
const socket = server.getSocket(socketId);


socket?.sendout({
    id: Math.random().toString(36).substring(2),
    method: 'notice',
    result: 'noticed!'
});
```

server中所有的socket连接，可通过`server.clients`来获取，也可以通过自定义条件的方式来获取某些socket连接：

```typescript
const socket = server.getSockets((attr:SocketAttr)=>{
    if(attr.role === 'admin'){
        return true;
    }
});
```

`server.getSockets`接受一个回调函数，该函数的入参为某个socket的所有属性，需要返回一个`Boolean`值来判断某个soeket连接是否为需要获取的socket对象。

### 获取连接属性

获取单个socket连接的属性，实际调用的是[socket属性](#socket属性)里属性的获取函数。

```typescript
const socketId = 'xxxxxxx';
// 获取全部属性
const attr = server.getSocketAttr(socketId);
// 获取某个属性的值
const value = server.getSocketAttr(socketId, 'key1');
// 获取某些属性的值
const attr = server.getSocketAttr(socketId, 'key1', 'key2', ...);
```

如果要根据条件筛选socket并获取连接的属性，可以调用`server.getSocketsAttr`，如下获取某些socket连接的全部属性值：

```typescript
const attrs = server.getSocketsAttr((attr: SocketAttr) => {
    if(attr.role === 'admin'){
        return true;
    }
});
```

同`server.getSocketAttr`一样，你也可以获取部分属性值：

```typescript
// 获取某一个属性的值
const values = server.getSocketsAttr((attr: SocketAttr) => {
    if(attr.role === 'admin'){
        return true;
    }
}, 'key1');


// 获取某几个属性的值
const values = server.getSocketsAttr((attr: SocketAttr) => {
    if(attr.role === 'admin'){
        return true;
    }
}, 'key1', 'key2', ...);
```

### 设置连接属性

你也可以通过`server`设置某个socket连接的属性值：

```typescript
const socketId = 'xxxxxxx';

server.setSocketAttr(socketId, {
    key1: '1',
    key2: '2'
});
```

## 回调

### server.online

有客户端连接成功的回调函数，可传入多个，按顺序执行

```typescript
import { OnlineCallbackFn } from '@coco-sheng/websocket-server';

const online1: OnlineCallbackFn = () => { 
    // ...
};
const online2: OnlineCallbackFn = () => { 
    // ...
};

server.online(online1, online2);
```

### server.offline

有客户端断开连接时的回调函数，可传入多个，按顺序执行

```typescript
import { OfflineCallbackFn } from '@coco-sheng/websocket-server';

const offline1: OfflineCallbackFn<SocketAttr> = () => { };
const offline2: OfflineCallbackFn<SocketAttr> = () => { };

server.offline(offline1, offline2);
```

### server.error

捕获到全局错误时的回调，系统内置了一个全局错误处理逻辑，当捕获到错误时，会发送一条符合`jsonrpc2.0`规范的错误信息到客户端（客户端已下线除外），当配置了log(详情见扩展配置)，该错误信息也会打印到控制台。如果设置`server.error`回调函数，则不会执行系统内置的错误逻辑，但是依然会根据log配置打印错误信息，但是`server.error`设置的**错误回调函数内部的错误并不会再次捕获处理**。

```typescript
import { ErrorCallbackFn } from '@coco-sheng/websocket-server';

// 你的项目内通用的错误数据结构
interface SystemError {
    msg: string
    code: number
    data: any
}


const error1: ErrorCallbackFn<SocketAttr, SystemError> = () => { };
const error2: ErrorCallbackFn<SocketAttr, SystemError> = () => { };

server.error(error1, error2);
```

## 扩展配置

`new WebsocketServer(config, options);`

- `[options.log]`：`Boolean | Function`，默认`false`关闭日志打印，当为`true`时，将采用内置的`log4js`日志配置打印日志；如果为一个函数，则需要返回一个`Logger`对象，系统的日志将采用该对象打印。

- `[options.compression]`：`zlib`，默认`undefined`。当为`zlib`时，将对服务器发送到客户端的数据先进行zlib压缩，再发送。

```typescript
import { WebsocketServer } from '@coco-sheng/websocket-server';


const port = 3403;

export default new WebsocketServer<SocketAttr>({ port }, {
    log: () => console,
    compression: 'zlib'
});
```

客户端解压缩示例：

```typescript
client.on('open',async ()=>{
    const result = await new Promise(resolve => {
        client.send(JSON.stringify({ method: 'connect', id: 1, params: [], jsonrpc: '2.0' }));
        client.once('message', data => resolve(JSON.parse(zlib.inflateSync(data as Buffer).toString())));
    });

    console.log(result);
    // {
    //     jsonrpc: '2.0',
    //     id: 2,
    //     method: 'ping',
    //     result: 'pong'
    // }
});
```

# 客户端

# 关于ping

服务器端不建议主动去ping客户端以此对连接进行保活，这样做会消耗服务器性能，所以系统内置了一个`ping`的method，当客户端发送`ping`的method时，系统会回复一条数据，详见[内置method](#%E5%86%85%E7%BD%AEmethod)。当然，你也可以通过其它方式实现ping来对连接保活。

# 其它

- 关于服务器端多实例部署的解决方案，详见[多实例管理方案]().

- 暂无其它。
