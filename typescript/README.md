typescript目录下`example.interface.ts`、`example.notype.ts`、`example.simple.ts`文件仅为ts类型定义示例参考文件，没有考虑业务逻辑严密性，也不具备严谨的运行逻辑。
<br/>
ts类型定义的使用主要用于以下三个方面：
- request：
  - Server端的`register`，根据其注册的`method`，能方便的定义其handler要处理的参数。
  - Client端的`request`，根据`method`参数，能方便的定义其请求参数`params`。
- Client发送通知：
  - Client端的`notify`，根据`notice`，能方便的定义通知的参数。
  - Server端的`onNotice`，根据监听的`notice`，即Client`notify`的`notice`，能方便的定义其handler要处理的参数。
- Server发送通知：
  - Server端的`sendout`，根据`method`，能方便的定义通知的参数。
  - Client端的`listening/listeningOnce`，根据监听的`method`，即Server`sendout`的`method`，能方便的定义其handler要处理的参数。


示例主要包括三种定义方式：
- 如果Client的开发也支持ts定义，且Server和Client使用同一套ts定义：
  - 可以使用函数定义的方式，将Server端`register`的参数`method`、其handler的`params`、handler的返回类型和Client端`request`的参数`method`、`params`、请求的返回类型，分别定义为函数的名称、参数、返回类型。多个函数定义则可使用`interface`接口定义。
  - 将Client端`notify`的参数`notice`、`params`和Server端`onNotice`的参数`notice`、其handler的参数，使用`interface`的形式，分别定义为`key`，`value`。
  - 将Server端`sendout`的参数`method`、`result`和Client端`listening/listeningOnce`的参数`method`、其handler的参数，使用`interface`的形式，分别定义为`key`，`value`。
- 以`string`简单定义Server端提供的请求，Client/Server发送的通知，其请求参数和handler的参数都不需要详细定义。
- 不定义任何类型，直接使用。
