import { MapStore } from '../../src/store/store';

describe('MapStore', () => {
	let mapStore: MapStore;

	beforeEach(() => {
		mapStore = new MapStore();
	});

	it('should add a request', async () => {
		const ip = '192.168.1.1';
		const timestamp = Date.now();

		await mapStore.addRequest(ip, timestamp);

		expect(await mapStore.countRequests(ip, timestamp - 1000)).toBe(1);
	});

	it('should count requests in the window', async () => {
		const ip = '192.168.1.1';
		const timestamp = Date.now();

		await mapStore.addRequest(ip, timestamp - 9000);
		await mapStore.addRequest(ip, timestamp - 2000);
		await mapStore.addRequest(ip, timestamp);

		const count = await mapStore.countRequests(ip, timestamp - 5000);

		expect(count).toBe(2);
	});

	it('should remove old requests', async () => {
		const ip = '192.168.1.1';
		const timestamp = Date.now();

		await mapStore.addRequest(ip, timestamp - 9000);
		await mapStore.addRequest(ip, timestamp - 3000);
		await mapStore.addRequest(ip, timestamp);

		await mapStore.removeOldRequests(ip, timestamp - 5000);

		const countAfterRemoval = await mapStore.countRequests(ip, timestamp - 10000);
		expect(countAfterRemoval).toBe(2);
	});
});

