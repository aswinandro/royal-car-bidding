import { Injectable } from "@nestjs/common"
import { ThrottlerGuard } from "@nestjs/throttler"

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): string {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.id || req.ip;
  }
