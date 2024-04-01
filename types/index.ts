import { Request } from "express"
import { Store } from "../src/store/store"

export type UserConfigType = 'authenticatedPremium' | 'authenticatedStandard' | 'unauthenticated'
export type RateLimitConfig = Record<string, UserRateLimitConfig>

export type CreateRateLimiterProps = {
	limit: number; // Default rate limit
	windowMs: number; // Default rate limit window in ms
	store: Store,
	message?: string,
	config?: RateLimitConfig
}

export type RateLimitSetting = {
	limit: number;
	windowMs: number;
}

export type RateLimitOverride = {
	limit: number;
	windowMs: number;
	condition: (req: Request) => boolean;
}

export type UserRateLimitConfig = {
	authenticatedStandard: RateLimitSetting;
	authenticatedPremium: RateLimitSetting;
	unauthenticated: RateLimitSetting;
	overrides?: RateLimitOverride[]
}

