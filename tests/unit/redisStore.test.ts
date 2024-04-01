import { RedisStore } from '../../src/store/store';
import { RedisClientType, createClient } from 'redis';

jest.mock('redis', () => ({
	createClient: jest.fn().mockReturnValue({
		connect: jest.fn(),
		zAdd: jest.fn(),
		zCount: jest.fn(),
		zRemRangeByScore: jest.fn(),
		on: jest.fn(),
	})
}));

describe('RedisStore', () => {
	let redisStore: RedisStore;
	let mockClient: RedisClientType;

	beforeEach(() => {
		jest.clearAllMocks();
		mockClient = createClient()
		redisStore = new RedisStore();
		redisStore.client = mockClient as any;
	});

	it('should add a request', async () => {
		const ip = '192.168.1.1';
		const timestamp = Date.now();

		await redisStore.addRequest(ip, timestamp);

		expect(mockClient.zAdd).toHaveBeenCalledWith(`rate_limit:${ip}`, { score: timestamp, value: `${timestamp}` });
	});

	it('should count requests in the window', async () => {
		const ip = '192.168.1.1';
		const windowStartTimestamp = Date.now() - 10000;

		mockClient.zCount = jest.fn().mockResolvedValueOnce(5);

		const count = await redisStore.countRequests(ip, windowStartTimestamp);

		expect(mockClient.zCount).toHaveBeenCalledWith(`rate_limit:${ip}`, windowStartTimestamp, '+inf');
		expect(count).toBe(5);
	});

	it('should remove old requests', async () => {
		const ip = '192.168.1.1';
		const windowStartTimestamp = Date.now() - 10000;

		await redisStore.removeOldRequests(ip, windowStartTimestamp);

		expect(mockClient.zRemRangeByScore).toHaveBeenCalledWith(`rate_limit:${ip}`, '-inf', windowStartTimestamp);
	});
});
