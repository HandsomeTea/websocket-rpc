import { WebsocketServer, WebsocketClient, Attribute, ServerOptions } from '../../src';

export default <Attr extends Attribute>(port: number, serverOptions?: ServerOptions) => {
	const server = new WebsocketServer<Attr>({ port }, serverOptions);
	const client = new WebsocketClient(`ws://localhost:${port}`);

	return {
		server,
		client
	};
};
