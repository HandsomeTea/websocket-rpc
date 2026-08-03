import { WebsocketServer, WebsocketClient, Attribute } from '../../src';

export default <Attr extends Attribute>(port: number) => {
	const server = new WebsocketServer<Attr>({ port });
	const client = new WebsocketClient(`ws://localhost:${port}`);

	return {
		server,
		client
	};
};
