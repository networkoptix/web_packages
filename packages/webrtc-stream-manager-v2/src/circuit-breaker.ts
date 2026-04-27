// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents infinite retry loops by implementing a circuit breaker pattern with:
 * - Max retry attempts tracking
 * - Exponential backoff delays
 * - Circuit states (CLOSED, OPEN, HALF_OPEN)
 * - Automatic reset after cooldown period
 * - Comprehensive logging for debugging
 */

export enum CircuitState {
    CLOSED = 'CLOSED',       // Normal operation, requests pass through
    OPEN = 'OPEN',           // Too many failures, requests fail immediately
    HALF_OPEN = 'HALF_OPEN'  // Testing if service recovered
}

export interface CircuitBreakerConfig {
    /** Maximum number of consecutive failures before opening circuit */
    maxAttempts: number;
    /** Time in ms before attempting to reset from OPEN to HALF_OPEN */
    resetTimeout: number;
    /** Use exponential backoff for retry delays */
    exponentialBackoff: boolean;
    /** Base delay in ms for backoff calculation */
    baseDelay: number;
    /** Maximum delay in ms for backoff */
    maxDelay: number;
    /** Optional logger for circuit breaker events */
    logger?: Console;
    /** Identifier for this circuit breaker instance */
    name?: string;
}

export interface CircuitBreakerStats {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    totalAttempts: number;
    lastFailureTime: number | null;
    lastSuccessTime: number | null;
    openedAt: number | null;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
    maxAttempts: 5,
    resetTimeout: 30000,      // 30 seconds
    exponentialBackoff: true,
    baseDelay: 1000,          // 1 second
    maxDelay: 60000,          // 60 seconds
    name: 'CircuitBreaker'
};

export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private successCount: number = 0;
    private totalAttempts: number = 0;
    private lastFailureTime: number | null = null;
    private lastSuccessTime: number | null = null;
    private openedAt: number | null = null;
    private resetTimer: ReturnType<typeof setTimeout> | null = null;
    private config: CircuitBreakerConfig;

    constructor(config: Partial<CircuitBreakerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.log('Circuit breaker initialized', { ...this.config });
    }

    /**
     * Check if circuit allows request to proceed
     */
    public canAttempt(): boolean {
        switch (this.state) {
            case CircuitState.CLOSED:
                return true;

            case CircuitState.OPEN:
                // Check if reset timeout has elapsed
                if (this.shouldAttemptReset()) {
                    this.transitionTo(CircuitState.HALF_OPEN);
                    return true;
                }
                this.log('Request blocked - circuit is OPEN', {
                    failureCount: this.failureCount,
                    timeSinceOpen: this.openedAt ? Date.now() - this.openedAt : 0,
                    resetTimeoutRemaining: this.openedAt
                        ? Math.max(0, this.config.resetTimeout - (Date.now() - this.openedAt))
                        : 0
                });
                return false;

            case CircuitState.HALF_OPEN:
                // Only allow one test request in half-open state
                return this.totalAttempts === 0;

            default:
                return false;
        }
    }

    /**
     * Record successful execution
     */
    public recordSuccess(): void {
        this.totalAttempts++;
        this.successCount++;
        this.lastSuccessTime = Date.now();
        this.failureCount = 0;

        if (this.state === CircuitState.HALF_OPEN) {
            this.transitionTo(CircuitState.CLOSED);
            this.log('Service recovered - circuit CLOSED');
        }

        // Clear any pending reset timer
        this.clearResetTimer();
    }

    /**
     * Record failed execution
     */
    public recordFailure(error?: unknown): void {
        this.totalAttempts++;
        this.failureCount++;
        this.lastFailureTime = Date.now();

        this.log('Failure recorded', {
            failureCount: this.failureCount,
            maxAttempts: this.config.maxAttempts,
            error: error instanceof Error ? error.message : String(error)
        });

        if (this.failureCount >= this.config.maxAttempts) {
            this.transitionTo(CircuitState.OPEN);
            this.scheduleReset();
        }
    }

    /**
     * Get current retry delay based on failure count and backoff strategy
     */
    public getRetryDelay(): number {
        if (!this.config.exponentialBackoff) {
            return this.config.baseDelay;
        }

        // Exponential backoff: baseDelay * 2^(failureCount-1)
        const exponentialDelay = this.config.baseDelay * Math.pow(2, this.failureCount - 1);
        const delayWithJitter = exponentialDelay * (0.5 + Math.random() * 0.5); // Add 50% jitter

        return Math.min(delayWithJitter, this.config.maxDelay);
    }

    /**
     * Reset circuit breaker to initial state
     */
    public reset(): void {
        this.log('Manual reset triggered');
        this.clearResetTimer();
        this.failureCount = 0;
        this.successCount = 0;
        this.totalAttempts = 0;
        this.lastFailureTime = null;
        this.lastSuccessTime = null;
        this.openedAt = null;
        this.transitionTo(CircuitState.CLOSED);
    }

    /**
     * Get current circuit breaker statistics
     */
    public getStats(): CircuitBreakerStats {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            totalAttempts: this.totalAttempts,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            openedAt: this.openedAt
        };
    }

    /**
     * Check if circuit is currently open
     */
    public isOpen(): boolean {
        return this.state === CircuitState.OPEN;
    }

    /**
     * Check if circuit is currently closed
     */
    public isClosed(): boolean {
        return this.state === CircuitState.CLOSED;
    }

    /**
     * Check if circuit is in half-open state
     */
    public isHalfOpen(): boolean {
        return this.state === CircuitState.HALF_OPEN;
    }

    /**
     * Execute a function with circuit breaker protection
     */
    public async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (!this.canAttempt()) {
            throw new Error(`Circuit breaker is ${this.state} - request rejected`);
        }

        try {
            const result = await fn();
            this.recordSuccess();
            return result;
        } catch (error) {
            this.recordFailure(error);
            throw error;
        }
    }

    /**
     * Execute with automatic retry and backoff
     */
    public async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
        while (this.canAttempt()) {
            try {
                const result = await this.execute(fn);
                return result;
            } catch (error) {
                if (this.isOpen()) {
                    throw new Error(`Circuit breaker opened after ${this.failureCount} failures: ${error instanceof Error ? error.message : String(error)}`);
                }

                const delay = this.getRetryDelay();
                this.log(`Retrying after ${delay}ms`, {
                    attempt: this.failureCount,
                    maxAttempts: this.config.maxAttempts
                });

                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw new Error(`Circuit breaker is ${this.state} - max attempts exceeded`);
    }

    // Private helper methods

    private shouldAttemptReset(): boolean {
        if (!this.openedAt) return false;
        return Date.now() - this.openedAt >= this.config.resetTimeout;
    }

    private transitionTo(newState: CircuitState): void {
        const oldState = this.state;
        this.state = newState;

        if (newState === CircuitState.OPEN) {
            this.openedAt = Date.now();
        } else if (newState === CircuitState.CLOSED) {
            this.openedAt = null;
        }

        this.log(`State transition: ${oldState} → ${newState}`, {
            failureCount: this.failureCount,
            successCount: this.successCount
        });
    }

    private scheduleReset(): void {
        this.clearResetTimer();

        this.log(`Scheduling reset in ${this.config.resetTimeout}ms`);
        this.resetTimer = setTimeout(() => {
            if (this.state === CircuitState.OPEN) {
                this.transitionTo(CircuitState.HALF_OPEN);
            }
        }, this.config.resetTimeout);
    }

    private clearResetTimer(): void {
        if (this.resetTimer) {
            clearTimeout(this.resetTimer);
            this.resetTimer = null;
        }
    }

    private log(message: string, data?: Record<string, unknown>): void {
        if (this.config.logger) {
            const prefix = `[CircuitBreaker:${this.config.name}]`;
            if (data) {
                this.config.logger.info(prefix, message, data);
            } else {
                this.config.logger.info(prefix, message);
            }
        }
    }
}

/**
 * Factory function to create a circuit breaker with preset configurations
 */
export function createCircuitBreaker(
    name: string,
    config: Partial<CircuitBreakerConfig> = {}
): CircuitBreaker {
    return new CircuitBreaker({ ...config, name });
}

/**
 * Preset configurations for common use cases
 */
export const CircuitBreakerPresets = {
    /** Aggressive retry for critical operations */
    AGGRESSIVE: {
        maxAttempts: 3,
        resetTimeout: 10000,
        baseDelay: 500,
        maxDelay: 5000,
        exponentialBackoff: true
    },

    /** Balanced retry for normal operations */
    BALANCED: {
        maxAttempts: 5,
        resetTimeout: 30000,
        baseDelay: 1000,
        maxDelay: 30000,
        exponentialBackoff: true
    },

    /** Conservative retry for non-critical operations */
    CONSERVATIVE: {
        maxAttempts: 10,
        resetTimeout: 60000,
        baseDelay: 2000,
        maxDelay: 60000,
        exponentialBackoff: true
    },

    /** Linear backoff without exponential increase */
    LINEAR: {
        maxAttempts: 5,
        resetTimeout: 30000,
        baseDelay: 2000,
        maxDelay: 10000,
        exponentialBackoff: false
    }
} as const;
