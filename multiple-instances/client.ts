import { WebsocketClient } from '../src'

/** 2分钟后，会有3个客户端下线，注意观察session数据 */

const test = async () => {
	for (let s = 0; s < 10; s++) {
		const client = new WebsocketClient('ws://localhost:3801');

		await client.open();

		// eslint-disable-next-line no-console
		console.log(`client ${s} open`);
		await client.request('login', { user: `user${s}` });

		client.offline(() => {
			// eslint-disable-next-line no-console
			console.log(`client ${s} closed, attention!`);
		});

		if (s > 6) {
			setTimeout(() => {
				client.close();
			}, 2 * 60 * 1000);
		}
	}
};

test();
