# API Rate Limiter

## Introduction

This project implements a middleware for Express.js in TypeScript to enforce rate limiting on API requests, tracking requests per IP address and applying limits over a specified timeframe.

## Features

- **Flexible Rate Limiting**: Different limits for authenticated and unauthenticated users, customisable per endpoint.
- **Storage Options**: Includes `RedisStore` for production environments and `MapStore` for development or testing.
- **Configurable**: Easy setup with a configuration object for different endpoints and user types.
- **Overrides**: Supports conditional overrides to adjust rate limits based on request specifics.

## Storage Options

- **RedisStore**: Utilises Redis for rate limiting data, suitable for high-performance production environments:
```typescript
	import { RedisStore } from './store/RedisStore';

	const redisStore = new RedisStore('redis://localhost:6379');
```
- **MapStore**: An in-memory store using a JavaScript Map, ideal for development or low-traffic environments.
```typescript
	import { MapStore } from './store/MapStore';

	const mapStore = new MapStore();
```

## Rate Limiting Configuration

Configure rate limits for different endpoints and user types using the `rateLimitConfig` object:
```typescript
const rateLimitConfig = {
    "/api/endpoint1": {
        authenticatedStandard: { limit: 10, windowMs: 3600000 },
        authenticatedPremium: { limit: 20, windowMs: 3600000 },
        unauthenticated: { limit: 5, windowMs: 3600000 },
        overrides: [
            {
                condition: (req) => req.query.specialEvent === 'true',
                limit: 50,
                windowMs: 1800000 // 30 secs
            }
        ]
    },
    // Define more endpoints as needed
};
```


## Usage

Integrate the rate limiter into your Express application by creating an instance of the rate limiter and applying it as middleware.
```typescript
import express from 'express';
import { createRateLimiter } from './middleware/RateLimiter';

const app = express();
const rateLimiter = createRateLimiter({
    store: redisStore, // or mapStore depending on your setup
    config: rateLimitConfig
});

app.use(rateLimiter);

app.get('/api/endpoint1', (req, res) => {
    res.send('This endpoint is rate-limited');
});

app.listen(3000, () => {
    console.log('Server listening on http://localhost:3000');
});
```

## Caveats of IP-based Rate Limiting

Relying solely on the request origin IP address for rate limiting can introduce several issues:

- **NAT and Shared IPs**: Multiple users behind the same network address translation (NAT) or proxy will share a single IP address. This means a single overactive user could consume the rate limit for all users on that network.
- **Dynamic IP Addresses**: Users with dynamic IP addresses can bypass the rate limit by obtaining a new IP address.
- **IP Spoofing**: Malicious users may spoof IP addresses to circumvent rate limits, although this can be mitigated by using a secure and well-configured network infrastructure.
- **Unfair Limiting**: Services accessed through public networks, like libraries or cafes, could be unfairly rate-limited due to the high volume of traffic from a single IP.

## Improvements and Further Development

To enhance the rate limiting functionality and address the above caveats, we can consider the following improvements:

- **User Identification**: Use a combination of IP address and user identifiers (like API tokens or session IDs) to more accurately identify and rate limit requests.
- **Rate Limiting Algorithms**: Implement advanced algorithms like token bucket or leaky bucket for more flexible and fair rate limiting.
- **Behavioral Analysis**: Integrate anomaly detection to identify and mitigate abusive behavior patterns without strictly limiting legitimate users.
- **Whitelisting and Blacklisting**: Allow for IP whitelisting to ensure critical services or users are not blocked, and blacklisting to block IPs that consistently show malicious behavior.


