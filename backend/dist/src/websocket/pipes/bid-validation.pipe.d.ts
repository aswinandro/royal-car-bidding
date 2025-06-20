import { type PipeTransform, type ArgumentMetadata } from "@nestjs/common";
export declare class BidValidationPipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata): Promise<any>;
}
