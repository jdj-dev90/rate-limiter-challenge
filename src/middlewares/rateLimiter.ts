import { type Request, type Response, type NextFunction } from 'express'
import { CreateRateLimiterProps, UserConfigType } from '../../types'

export const createRateLimiter = (props: CreateRateLimiterProps) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			if (!req.ip) {
				throw new Error('Request does not contain IP address');
			}

			const { store, message = 'Rate limit exceeded', config } = props;
			let { limit, windowMs } = props;

			const endpointConfig = config?.[req.path];
			if (endpointConfig) {
				const userStatus = getUserStatus(req);
				const userSpecificConfig = endpointConfig[userStatus];

				if (userSpecificConfig) {
					limit = userSpecificConfig.limit;
					windowMs = userSpecificConfig.windowMs;
				}

				// Check for overrides
				const override = endpointConfig.overrides?.find(ov => ov.condition(req));
				if (override) {
					limit = override.limit;
					windowMs = override.windowMs;
				}
			}

			const currentRequestTime = Date.now();
			const windowStartTimestamp = currentRequestTime - windowMs;

			await store.addRequest(req.ip, currentRequestTime);
			await store.removeOldRequests(req.ip, windowStartTimestamp);
			const requestCount = await store.countRequests(req.ip, windowStartTimestamp);

			if (requestCount > limit) {
				res.status(429).send(message);
				return;
			}

			next();
		} catch (err) {
			next(err);
		}
	};
};

function getUserStatus(req: Request): UserConfigType {
	const authToken = req.headers['x-auth'] ?? '';

	if (authToken) {
		const isPremiumUser = checkPremiumUser(Array.isArray(authToken) ? authToken[0] : authToken);
		return isPremiumUser ? 'authenticatedPremium' : 'authenticatedStandard';
	}

	return 'unauthenticated';
}

function checkPremiumUser(token: string): boolean {
	return token === 'Premium Token'
}


