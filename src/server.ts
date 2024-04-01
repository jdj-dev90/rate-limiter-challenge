import express, { Express, Request, Response } from "express";
import { createRateLimiter } from './middlewares/rateLimiter'
import dotenv from "dotenv";
import { RedisStore } from "./store/store";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

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

const rateLimiter = createRateLimiter({
	limit: 5,
	windowMs: 60 * 60 * 1000, // 1 hour in milliseconds
	store: new RedisStore('redis://redis:6379'),
	config: rateLimitConfig
});

app.use(rateLimiter)

app.get("/", (req: Request, res: Response) => {
	console.log('Connected')
	res.send("Success");
});

app.get('/api/endpoint1', (req, res) => res.status(200).send());

app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
});
