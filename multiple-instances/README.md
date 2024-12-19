<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [说明](#%E8%AF%B4%E6%98%8E)
- [方案](#%E6%96%B9%E6%A1%88)
- [示例说明](#%E7%A4%BA%E4%BE%8B%E8%AF%B4%E6%98%8E)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

`@coco-sheng/websocket-rpc`服务器并不关心是否为多实例部署，多实例部署所出现的业务问题需要在业务层面解决，本文档将给出多实例部署在业务层面的解决方案。

# 说明

多实例部署说的是，同一套websocket服务同时部署多个进程，这些进程可能分布在不同docker镜像、不同k8s的pod、不同服务器等情况。

多实例部署时，业务上可能会遇到一些情况：

- 同一个用户的多个websocket连接不能保证连接到同一个服务器进程(实例)上，当向某个用户的所有客户端发送消息时，出现某些端收不到消息的情况。

- 当需要向某个客户端发送消息时，不知道该客户端所在的连接在那个服务器实例上。

- 当客户端出现断线重连(暂时断网、某个服务器实例宕机等)时，无法保证客户端的两次连接在同一个服务器实例上。

本文旨在对以上问题给出解决方案。

# 方案

- 服务器实例保活。

- 客户端连接信息(session)记录，一般在用户登录成功时记录，若没有用户体系，则应在客户端连接成功后立即记录。

- 定时清除已经离线的服务器实例信息，并清除该实例下的客户端连接信息(session)。

- 连接断开时清除该连接的数据(session信息)。

# 示例说明
示例代码在`multiple-instances`文件夹下，内容如下：
- `model`文件夹内容：数据库model文件示例，以mongodb为例。
  - `instance.ts`：服务器实例保活信息。
  - `session.ts`：客户端连接信息。
- `service`文件夹内容：服务器多实例相关业务处理示例。
  - `instanceService.ts`：服务器实例保活处理，已启动服务器的检测和已下线服务器的清理。
  - `sessionService.ts`：客户端连接信息处理，记录客户端连接在哪个服务器实例，及客户端连接信息(可根据业务情况而定)。
- `client.ts`：模拟多个客户端连接到服务器。
- `server.ts`：使用nodejs的`cluster`模块模拟多个服务器运行实例。
