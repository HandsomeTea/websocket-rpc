import WS from 'ws';

/** 2分钟后，会有3个客户端下线，注意观察session数据 */
for (let s = 0; s < 10; s++) {
    const client = new WS('ws://localhost:3801');

    client.on('open', () => {
        // eslint-disable-next-line no-console
        console.log(`client ${s} open`);
        client.send(JSON.stringify({ method: 'login', id: new Date().getTime(), params: { user: `user${s}` }, jsonrpc: '2.0' }));
    });

    client.on('close', () => {
        // eslint-disable-next-line no-console
        console.log(`client ${s} closed, attention!`);
    });

    if (s > 6) {
        setTimeout(() => {
            client.close();
        }, 2 * 60 * 1000);
    }
}
