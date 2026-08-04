<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [快速开始](#%E5%BF%AB%E9%80%9F%E5%BC%80%E5%A7%8B)
  - [安装](#%E5%AE%89%E8%A3%85)
  - [示例代码](#%E7%A4%BA%E4%BE%8B%E4%BB%A3%E7%A0%81)
- [这是什么？](#%E8%BF%99%E6%98%AF%E4%BB%80%E4%B9%88)
  - [为什么要做](#%E4%B8%BA%E4%BB%80%E4%B9%88%E8%A6%81%E5%81%9A)
- [Server](#server)
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
- [Client](#client)
  - [基本用法](#%E5%9F%BA%E6%9C%AC%E7%94%A8%E6%B3%95)
  - [发送请求](#%E5%8F%91%E9%80%81%E8%AF%B7%E6%B1%82)
    - [基本请求](#%E5%9F%BA%E6%9C%AC%E8%AF%B7%E6%B1%82)
    - [单次请求自定义超时](#%E5%8D%95%E6%AC%A1%E8%AF%B7%E6%B1%82%E8%87%AA%E5%AE%9A%E4%B9%89%E8%B6%85%E6%97%B6)
    - [带类型约束的方法名](#%E5%B8%A6%E7%B1%BB%E5%9E%8B%E7%BA%A6%E6%9D%9F%E7%9A%84%E6%96%B9%E6%B3%95%E5%90%8D)
  - [监听服务端主动推送](#%E7%9B%91%E5%90%AC%E6%9C%8D%E5%8A%A1%E7%AB%AF%E4%B8%BB%E5%8A%A8%E6%8E%A8%E9%80%81)
    - [基本监听](#%E5%9F%BA%E6%9C%AC%E7%9B%91%E5%90%AC)
    - [一次性监听](#%E4%B8%80%E6%AC%A1%E6%80%A7%E7%9B%91%E5%90%AC)
    - [取消监听](#%E5%8F%96%E6%B6%88%E7%9B%91%E5%90%AC)
  - [连接状态](#%E8%BF%9E%E6%8E%A5%E7%8A%B6%E6%80%81)
  - [离线处理](#%E7%A6%BB%E7%BA%BF%E5%A4%84%E7%90%86)
  - [获取原始 WebSocket 实例](#%E8%8E%B7%E5%8F%96%E5%8E%9F%E5%A7%8B-websocket-%E5%AE%9E%E4%BE%8B)
  - [客户端 API 参考](#%E5%AE%A2%E6%88%B7%E7%AB%AF-api-%E5%8F%82%E8%80%83)
- [关于ping](#%E5%85%B3%E4%BA%8Eping)
- [其它](#%E5%85%B6%E5%AE%83)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# 快速开始

## 安装

```shell
npm install --save @coco-sheng/websocket-rpc
```

## 示例代码

服务端：

```typescript
import { WebsocketServer } from '@coco-sheng/websocket-rpc';

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
import { WebsocketClient } from '@coco-sheng/websocket-rpc';

const client = new WebsocketClient('ws://localhost:3403');

await client.open();
const result = await client.request('hello');


console.log(result);
// hello world!
```


# 这是什么？

这是一个基于[ws](https://www.npmjs.com/package/ws)，遵循[JSON-RPC 2.0](https://wiki.geekdream.com/Specification/json-rpc_2.0.html)协议的websocket应用框架,灵感来源于实际项目中使用websocket实现rpc的需求，且可用性经过了实际项目的检测，性能表现良好，该项目专注RPC设计，无业务逻辑入侵，做纯粹的websocket RPC。

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

我们希望的服务器端没有太多针对请求的甄别判断来区分具体处理的业务，直接可以将精力聚焦到对业务的处理上。同时，我们对客户端不用对业务请求的结果做甄别，不用担心接收到的数据不是该业务的结果，也不用写大量的冗余监听。这就是`@coco-sheng/websocket-rpc`想要做的，除此之外，我们还针对服务器端上线、下线、基本错误、日志等情况做了处理，同时给出多实例部署的解决方案。当然你也可以从服务端/客户端能方便的获取到连接实例，根据自己的业务需求发送其它非JSON-RPC 2.0规范的数据。

`@coco-sheng/websocket-rpc`经过了实际项目的检测，在1核CPU1G内存的设备上部署服务器端，能同时维持最多2万个客户端连接，qps在20到30之间(根据业务逻辑的复杂性而定)。


# Server

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
import { MethodFn } from '@coco-sheng/websocket-rpc';
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


// 使用变量定义
const testMethod: MethodFn<SocketAttr> = () => {
    console.log('test');
};


server.register({ testMethod });
```

client.ts

```typescript
import { WebsocketClient } from '@coco-sheng/websocket-rpc';

const client = new WebsocketClient('ws://localhost:3403');

await client.open();

const result1 = await client.request('hello');
console.log(result1);
// { result: 'hello world!' }

const result2 = await client.request('hello1');
console.log(result2);
// { result: 'hello world1!' }

const result3 = await client.request('hello2');
console.log(result3);
// { result: { result: 'hello world2!' } }

const result4 = await client.request('hello3');
console.log(result4);
// { result: '' }

const result5 = await client.request('testMethod');
console.log(result5);
// { result: '' }
```

主动向客户端发送消息

```typescript
server.register('hello',(_params, socket)=>{
    // _params 为method的请求参数
    socket.sendout({
        method: 'test',
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
const client = new WebsocketClient('ws://localhost:3403');
await client.open();

const result1 = await client.isConnected();
console.log(result1);
// {
//     result: {
//         msg: 'connected',
//         session: 'xxxxxxxxxx'
//     }
// }

const result2 = await client.ping();
console.log(result2);
// { result: 'pong' }
```

> 注意：要中断method函数的执行，可以直接`return`，或者`throw`(你可以throw任何数据，比如数组、Object、Error对象等)，throw抛出的数据会被系统捕获，并封装为一个符合`JSONRPC-2.0`规范的错误数据返回，你也可以定义全局的[错误捕获回调函数](#servererror)，来自行处理`throw`抛出的数据。

## 中间件

中间件是一个在请求到达method之前对请求的数据和业务进行处理的函数。该函数如果返回一个Object，则会将该Object的属性挂载到当前socket连接的属性(后续业务可获取)上；返回其它数据结构则不做任何处理，后续业务逻辑也无法获取该返回值。可以定义针对全部method的一个或多个中间件，也可以为某个method定义一个或多个中间件，中间件的执行顺序为中间件定义的代码逻辑顺序。

middleware.ts，定义全局的中间件：

```typescript
import { MiddlewareFn } from '@coco-sheng/websocket-rpc';

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
import { MiddlewareFn } from '@coco-sheng/websocket-rpc';

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


// key1, key2, ...的属性
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
import crypto from 'crypto';

const socketId = 'xxxxxxxxx';
const socket = server.getSocket(socketId);


socket?.sendout({
    id: crypto.randomUUID(),
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
import { OnlineCallbackFn } from '@coco-sheng/websocket-rpc';

const online1: OnlineCallbackFn<SocketAttr> = () => {
    // ...
};
const online2: OnlineCallbackFn<SocketAttr> = () => {
    // ...
};

server.online(online1, online2);
```

### server.offline

有客户端断开连接时的回调函数，可传入多个，按顺序执行

```typescript
import { OfflineCallbackFn } from '@coco-sheng/websocket-rpc';

const offline1: OfflineCallbackFn<SocketAttr> = () => { };
const offline2: OfflineCallbackFn<SocketAttr> = () => { };

server.offline(offline1, offline2);
```

### server.error

捕获到全局错误时的回调，系统内置了一个全局错误处理逻辑，当捕获到错误时，会发送一条符合`jsonrpc2.0`规范的错误信息到客户端（客户端已下线除外），当配置了log(详情见扩展配置)，该错误信息也会打印到控制台。如果设置`server.error`回调函数，则不会执行系统内置的错误逻辑，但是依然会根据log配置打印错误信息，但是`server.error`设置的**错误回调函数内部的错误并不会再次捕获处理**。

```typescript
import { ErrorCallbackFn } from '@coco-sheng/websocket-rpc';

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
import { WebsocketServer } from '@coco-sheng/websocket-rpc';


const port = 3403;

export default new WebsocketServer<SocketAttr>({ port }, {
    log: () => console,
    compression: 'zlib'
});
```

客户端解压缩示例：

```typescript
// 使用 WebsocketClient 时，解压由 ws 库自动处理
// 如果使用裸 WebSocket，需要手动解压：
const ws = new WebSocket('ws://localhost:3403');
ws.on('message', data => {
    const decompressed = JSON.parse(zlib.inflateSync(data as Buffer).toString());
    console.log(decompressed);
});
```

# Client

## 基本用法

```typescript
import { WebsocketClient } from '@coco-sheng/websocket-rpc';

const client = new WebsocketClient('ws://localhost:3403');

// 打开连接
await client.open();

// 发送请求
const result = await client.request('hello', { name: 'world' });
console.log(result.result);
// hello world!

// 关闭连接
client.close();
```

## 发送请求

### 基本请求

```typescript
const result = await client.request('hello', { page: 1, size: 10 });

if (result.error) {
    console.error('请求失败:', result.error.message);
} else {
    console.log('请求成功:', result.result);
}
```

### 单次请求自定义超时

```typescript
// 第三个参数可以覆盖默认超时时间（单位：秒）
const result = await client.request('slow-task', params, { timeout: 30 });
```

### 带类型约束的方法名

和 `WebsocketServer` 一样，`WebsocketClient` 也支持 `<M>` 泛型约束方法名：

```typescript
type MyMethods = 'login' | 'logout' | 'getUserInfo';

const client = new WebsocketClient<MyMethods>('ws://localhost:3403');
await client.open();

// ✅ 有类型提示
const result = await client.request('login', { user: 'admin' });

// ❌ 编译报错：'deleteUser' 不在 MyMethods 中
// const result = await client.request('deleteUser');
```

## 监听服务端主动推送

### 基本监听

服务端可以通过 `socket.sendout()` 向客户端主动推送消息。客户端使用 `listening` 来监听：

服务端：

```typescript
server.register('subscribe', (_params, socket) => {
    // 每隔 5 秒推送一次
    const timer = setInterval(() => {
        socket.sendout({
            id: crypto.randomUUID(),
            method: 'price_update',
            result: { symbol: 'BTC', price: 42000 + Math.random() * 1000 }
        });
    }, 5000);

    // 连接断开时清除定时器
    socket.on('close', () => clearInterval(timer));
});
```

客户端：

```typescript
client.listening('price_update', (error, data) => {
    if (error) {
        console.error('推送错误:', error);
        return;
    }
    console.log('收到价格更新:', data);
});

await client.request('subscribe');
```

### 一次性监听

第三个参数 `once: true` 表示只监听一次：

```typescript
client.listening('first_blood', (error, data) => {
    console.log('首杀奖励:', data);
}, true);
```

### 取消监听

```typescript
const handler = (error, data) => { /* ... */ };

client.listening('some_event', handler);

// 取消监听
client.removeListening('some_event', handler);
```

## 连接状态

```typescript
// 状态常量
client.CONNECTING  // 0
client.OPEN        // 1
client.CLOSING     // 2
client.CLOSED      // 3

// 当前状态
console.log(client.status);  // 1
```

## 离线处理

```typescript
// 注册离线回调
client.offline(() => {
    console.log('连接已断开，执行清理逻辑');
});

client.offline(async () => {
    // 也可以在离线时做异步操作
    await cleanupResources();
});
```

## 获取原始 WebSocket 实例

如果需要发送非 JSON-RPC 格式的数据，可以直接操作原始 WebSocket：

```typescript
// 获取底层 WebSocket 实例
const ws = client.client;

ws.send('raw binary data');
ws.ping();
```

## 客户端 API 参考

| 方法 | 说明 |
|------|------|
| `new WebsocketClient<M>(address, configs?, options?)` | 创建客户端，`M` 可选约束方法名 |
| `client.open()` | 打开 WebSocket 连接 |
| `client.request(method, params?, option?)` | 发送 RPC 请求，`option.timeout` 可选覆盖超时 |
| `client.ping()` | 发送 ping，返回 `{ result: 'pong' }` |
| `client.listening(method, callback, once?)` | 监听服务端主动推送 |
| `client.removeListening(method, callback)` | 取消监听 |
| `client.offline(...callbacks)` | 注册断连回调 |
| `client.close()` | 关闭连接 |
| `client.status` | 当前连接状态 |
| `client.client` | 获取原始 WebSocket 实例 |

# 关于ping

服务器端不建议主动去ping客户端以此对连接进行保活，这样做会消耗服务器性能，所以系统内置了一个`ping`的method，当客户端发送`ping`的method时，系统会回复一条数据，详见[内置method](#%E5%86%85%E7%BD%AEmethod)。当然，你也可以通过其它方式实现ping来对连接保活。

# 其它

- 关于服务器端多实例部署的解决方案，详见[多实例管理方案](https://github.com/HandsomeTea/websocket-rpc/tree/develop/multiple-instances).

- 暂无其它。
