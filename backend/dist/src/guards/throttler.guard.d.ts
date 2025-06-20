import { ThrottlerGuard } from "@nestjs/throttler";
export declare class CustomThrottlerGuard extends ThrottlerGuard {
    protected getTracker(req: Record<string, any>): string;
}
