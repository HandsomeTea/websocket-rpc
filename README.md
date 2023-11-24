# websocket-service

简单易用的websocket服务器，基于[JSON-RPC 2.0](https://wiki.geekdream.com/Specification/json-rpc_2.0.html)协议。

# 快速开始

## 安装

```
npm install --save @coco-sheng/websocket-service
```

## 示例代码

server.ts

```typescript
import { WebsocketServer } from '@coco-sheng/websocket-service';


const port = 3403;

export default new WebsocketServer({ port });
```

start.ts

```typescript
import server from './server';

server.start();

```



# method

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


const testMethod = ()=>{
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





# 中间件

中间件是一个在请求到达method之前对请求的数据和业务进行处理的函数。该函数如果返回一个Object，则会将该Object的属性挂载到当前socket连接的属性(后续业务可获取)上；返回其它数据结构则不做任何处理，后续业务逻辑也无法获取该返回值。可以定义针对全部method的一个会多个中间件，也可以为某个method定义一个或多个中间件，中间件的执行顺序为中间件定义的代码逻辑顺序。

middleware.ts，定义全局的中间件：

```typescript
server.use(()=>{
    console.log('this is a middleware for all methods');
});
const mdw1 = (params, socket, method) =>{

    if(method !== 'login' && !socket.getAttr('userId')){
        throw Error('you must login to do this!')
    }

    console.log('middleware 1 for all methods');
};
const mdw2 = () =>{
    // ...
    return { type: '1' }
};

server.use(mdw1, mdw2, ...);
```

定义针对某个method的中间件。

```typescript
server.use('login', () => {
    console.log('to login method');

    // ...
    return { role: 'admin' };
    // 将会为当前socket设置一个role的属性，值为admin
});


const checkLoginToken = (params, socket) => {
    // ...
};
const checkPermission = () => {
    // ...
    throw new Error('you are no permission')
};


server.use('login', checkoutLoginToken, checkPermission);
```

# 

# 连接的属性

连接的属性即挂在到当前socket连接上的数据，属性的设置有两种方式，一种为中间件返回一个Object的方式(详见中间件部分)，另一种如下：

```typescript
// 在method中设置
server.register('hello', (_params, socket) => {
    socket.setAttr('key','value');
    socket.setAttr({
        user: '....'
        role: 'admin'
    });
});


// 在中间件中设置
server.use((_params, socket, method)=>{
    console.log('this is a middleware for all methods');

    const user = ...;
    if(method === 'login' && user.role === 'admin'){
        socket.setAttr('role', 'admin');
        socket.setAttr({
            user: '....'
            type: 'password-login'
        });
    }
});
```

## 属性的获取

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
const value = socket.getAttr('key1', 'key2', ...);


// key1,key2,...的属性
// {
//     key1: ...,
//     key2: ...,
//     ...   
// }
```





# 回调



# 获取连接





# 配置
