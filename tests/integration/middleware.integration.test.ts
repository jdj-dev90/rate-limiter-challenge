
import express, { Express, Request } from 'express';
import request from 'supertest';
import { createRateLimiter } from '../../src/middlewares/rateLimiter';
import { RedisStore } from '../../src/store/store';

const rateLimitConfig = {
	"/api/endpoint1": {
		authenticatedStandard: { limit: 10, windowMs: 3600000 },
		authenticatedPremium: { limit: 20, windowMs: 3600000 },
		unauthenticated: { limit: 5, windowMs: 3600000 },
		overrides: [
			{
				condition: (req: Request) => req.query.specialEvent === 'true',
				limit: 3,
				windowMs: 3600000
			}
		]
	},
};


describe('Rate Limiter Middleware Integration Test', () => {
	let app: Express;
	let redisStore: RedisStore

	beforeAll(async () => {
		redisStore = new RedisStore('redis://localhost:6380');
		const rateLimiter = createRateLimiter({
			limit: 5,
			windowMs: 60 * 60 * 1000,
			store: redisStore,
			message: 'Too many requests',
			config: rateLimitConfig
		});

		app = express();
		app.use(rateLimiter);
		app.get('/', (req, res) => {
			res.status(200).send('Success');
		});

		app.get('/api/endpoint1', (req, res) => res.status(200).send());

		// Give Redis a second to connect
		await new Promise(resolve => setTimeout(resolve, 1000));
	});

	beforeEach(async () => {
		redisStore.client.flushDb()
	});

	afterAll(async () => {
		redisStore.client.disconnect()
	});

	it('should allow requests under the rate limit', async () => {
		await request(app).get('/').expect(200);
		await request(app).get('/').expect(200);
	});

	it('should block default requests over the rate limit', async () => {
		for (let i = 0; i < 5; i++) {
			await request(app).get('/');
		}

		await request(app).get('/').expect(429);
	});


	it('should allow unauthenticated requests under the limit', async () => {
		for (let i = 0; i < 5; i++) {
			await request(app).get('/api/endpoint1').expect(200);
		}
		await request(app).get('/api/endpoint1').expect(429);
	});

	it('should allow authenticated standard requests under the limit', async () => {
		for (let i = 0; i < 10; i++) {
			await request(app)
				.get('/api/endpoint1')
				.set('x-auth', 'Standard Token')
				.expect(200);
		}
		await request(app)
			.get('/api/endpoint1')
			.set('x-auth', 'Standard Token')
			.expect(429);
	});

	it('should allow authenticated premium requests under the limit', async () => {
		for (let i = 0; i < 20; i++) {
			await request(app)
				.get('/api/endpoint1')
				.set('x-auth', 'Premium Token')
				.expect(200);
		}
		await request(app)
			.get('/api/endpoint1')
			.set('x-auth', 'Premium Token')
			.expect(429);
	});

	it('should apply overridden limits during special events', async () => {
		const responseTimes: number[] = [];
		const overrideLimit = 3;

		for (let i = 0; i < overrideLimit; i++) {
			const response = await request(app)
				.get('/api/endpoint1?specialEvent=true');
			responseTimes.push(response.status);
		}

		const successCount = responseTimes.filter(status => status === 200).length;

		expect(successCount).toBe(overrideLimit);
		await request(app)
			.get('/api/endpoint1?specialEvent=true')
			.expect(429);
	});
});
