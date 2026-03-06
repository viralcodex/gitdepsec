import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { RateLimits } from "../utils/rate_limits";

type MockResponse = {
    statusCode: number;
    body: unknown;
    status: (code: number) => MockResponse;
    json: (payload: unknown) => MockResponse;
};

const createMockRes = (): MockResponse => {
    const res: MockResponse = {
        statusCode: 200,
        body: undefined,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: unknown) {
            this.body = payload;
            return this;
        },
    };

    return res;
};

const runLimiter = (
    limiter: (req: any, res: any, next: () => void) => void,
    ip: string,
) => {
    const req = {
        ip,
        socket: { remoteAddress: ip },
    } as any;
    const res = createMockRes();

    let nextCalled = false;
    limiter(req, res as any, () => {
        nextCalled = true;
    });

    return { nextCalled, res };
};

describe("RateLimits", () => {
    let rateLimits: RateLimits;
    const originalDateNow = Date.now;

    afterEach(() => {
        Date.now = originalDateNow;
    });

    beforeEach(() => {
        // Disable refill so token consumption is deterministic in tests.
        rateLimits = new RateLimits(1, 0);
    });

    it("isolates token buckets per IP", () => {
        const ip1First = runLimiter(rateLimits.generalRateLimiter as any, "10.0.0.1");
        expect(ip1First.nextCalled).toBe(true);

        const ip1Second = runLimiter(rateLimits.generalRateLimiter as any, "10.0.0.1");
        expect(ip1Second.nextCalled).toBe(false);
        expect(ip1Second.res.statusCode).toBe(429);

        const ip2First = runLimiter(rateLimits.generalRateLimiter as any, "10.0.0.2");
        expect(ip2First.nextCalled).toBe(true);
    });

    it("enforces a strict hard cap for bucket count", () => {
        // Reduce cap for an inexpensive deterministic test.
        (rateLimits as any).maxBuckets = 3;

        const limiter = rateLimits.generalRateLimiter as any;

        for (let i = 1; i <= 10; i += 1) {
            runLimiter(limiter, `192.168.0.${i}`);
            expect((rateLimits as any).buckets.size).toBeLessThanOrEqual(3);
        }
    });

    it("evicts least-recently-used buckets when cap is reached", () => {
        (rateLimits as any).maxBuckets = 3;

        const limiter = rateLimits.generalRateLimiter as any;

        runLimiter(limiter, "1.1.1.1");
        runLimiter(limiter, "2.2.2.2");
        runLimiter(limiter, "3.3.3.3");

        // Touch 1.1.1.1 so 2.2.2.2 becomes the oldest.
        runLimiter(limiter, "1.1.1.1");

        runLimiter(limiter, "4.4.4.4");

        const keys = Array.from((rateLimits as any).buckets.keys());
        expect(keys).toContain("general:1.1.1.1");
        expect(keys).toContain("general:3.3.3.3");
        expect(keys).toContain("general:4.4.4.4");
        expect(keys).not.toContain("general:2.2.2.2");
    });

    it("removes idle buckets after TTL when cleanup runs", () => {
        let now = 1_000_000;
        Date.now = () => now;

        (rateLimits as any).bucketIdleTtlMs = 1_000;

        const limiter = rateLimits.generalRateLimiter as any;

        runLimiter(limiter, "9.9.9.1");
        runLimiter(limiter, "9.9.9.2");
        expect((rateLimits as any).buckets.size).toBe(2);

        // Move past both TTL and cleanup interval (60s) to trigger stale cleanup.
        now += 70_000;
        runLimiter(limiter, "9.9.9.3");

        const keys = Array.from((rateLimits as any).buckets.keys());
        expect(keys).toEqual(["general:9.9.9.3"]);
    });
});
