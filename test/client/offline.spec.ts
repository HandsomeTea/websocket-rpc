import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import instance from '../base';
import { WebSocketServer, WebSocketClient, Attribute } from '../../src';

let server: WebSocketServer<Attribute>;
let client: WebSocketClient;


beforeAll(async () => {
	({ server, client } = await instance());
});


afterAll(() => {
	client.close();
	server.close();
});


describe('客户端-offline', () => {

	it('offline', async () => {
		const result = await new Promise(resolve => {
			client.offline(() => {
				resolve('offline');
			});
			client.close();
		})

		expect(result).toBe('offline');
	});

});
