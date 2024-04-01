import { Request, Response } from 'express';
import { createRateLimiter } from '../../src/middlewares/rateLimiter';

const mockStore = {
	addRequest: jest.fn(),
	countRequests: jest.fn(),
	removeOldRequests: jest.fn()
};

describe('createRateLimiter middleware', () => {
	let rateLimiter: ReturnType<typeof createRateLimiter>;
	const message = 'Too many requests';

	beforeEach(() => {
		jest.clearAllMocks();
		rateLimiter = createRateLimiter({
			limit: 5,
			windowMs: 60 * 60 * 1000,
			store: mockStore,
			message
		});
	});

	it('should call next if under the rate limit', async () => {
		const req = { ip: '192.168.1.1', headers: { ['x-auth']: '' } } as unknown as Request;
		const res = { status: jest.fn(), send: jest.fn() } as unknown as Response;
		const next = jest.fn();

		mockStore.countRequests.mockResolvedValue(3);

		await rateLimiter(req, res, next);

		expect(next).toHaveBeenCalled();
		expect(res.status).not.toHaveBeenCalled();
	});

	it('should send 429 status if over the rate limit', async () => {
		const req = { ip: '192.168.1.1', headers: { ['x-auth']: '' } } as unknown as Request;
		const res = { status: jest.fn().mockReturnThis(), send: jest.fn() } as unknown as Response;
		const next = jest.fn();

		mockStore.countRequests.mockResolvedValue(6);

		await rateLimiter(req, res, next);

		expect(res.status).toHaveBeenCalledWith(429);
		expect(res.send).toHaveBeenCalledWith(message);
		expect(next).not.toHaveBeenCalled();
	});

	it('should handle store errors gracefully', async () => {
		const req = { ip: '192.168.1.1', headers: { ['x-auth']: '' } } as unknown as Request;
		const res = { status: jest.fn(), send: jest.fn() } as unknown as Response;
		const next = jest.fn();
		const error = new Error('Store error');

		mockStore.countRequests.mockRejectedValue(error);

		await rateLimiter(req, res, next);

		expect(next).toHaveBeenCalledWith(error);
	});
});

