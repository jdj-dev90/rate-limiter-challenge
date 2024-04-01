import { createClient } from 'redis';

export type Store = {
	addRequest(ip: string, timestamp: number): Promise<void>;
	countRequests(ip: string, windowStartTimestamp: number): Promise<number>;
	removeOldRequests(ip: string, windowStartTimestamp: number): Promise<void>;
}

export class MapStore implements Store {
	public store = new Map<string, number[]>();

	async addRequest(ip: string, timestamp: number): Promise<void> {
		const key = `rate_limit:${ip}`;
		const requests = this.store.get(key) || [];
		requests.push(timestamp);
		this.store.set(key, requests);
	}

	async countRequests(ip: string, windowStartTimestamp: number): Promise<number> {
		const key = `rate_limit:${ip}`;
		const requests = this.store.get(key) || [];
		return requests.filter(timestamp => timestamp >= windowStartTimestamp).length;
	}

	async removeOldRequests(ip: string, windowStartTimestamp: number): Promise<void> {
		const key = `rate_limit:${ip}`;
		const requests = this.store.get(key) || [];
		const filteredRequests = requests.filter(timestamp => timestamp >= windowStartTimestamp);
		this.store.set(key, filteredRequests);
	}
}

export class RedisStore implements Store {
	public client: ReturnType<typeof createClient>;

	constructor(url?: string) {
		this.client = createClient({ url });
		this.client.on('error', (err) => {
			console.error('Redis error:', err);
		});

		this.connect();
	}

	async connect(attempts: number = 5, delay: number = 1000): Promise<void> {
		try {
			await this.client.connect();
			console.log('Redis client connected successfully');
		} catch (err) {
			console.error('Redis client connection failed:', err);
			if (attempts > 1) {
				console.log(`Retrying connection in ${delay}ms...`);
				setTimeout(() => this.connect(attempts - 1, delay), delay);
			} else {
				console.error('All attempts to connect to Redis failed');
			}
		}
	}

	async addRequest(ip: string, timestamp: number): Promise<void> {
		const key = `rate_limit:${ip}`;
		await this.client.zAdd(key, { score: timestamp, value: `${timestamp}` });
	}

	async countRequests(ip: string, windowStartTimestamp: number): Promise<number> {
		const key = `rate_limit:${ip}`;
		return await this.client.zCount(key, windowStartTimestamp, '+inf');
	}

	async removeOldRequests(ip: string, windowStartTimestamp: number): Promise<void> {
		const key = `rate_limit:${ip}`;
		await this.client.zRemRangeByScore(key, '-inf', windowStartTimestamp);
	}
}


