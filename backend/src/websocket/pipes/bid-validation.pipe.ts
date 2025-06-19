import { type PipeTransform, Injectable, type ArgumentMetadata } from "@nestjs/common"
import { WsException } from "@nestjs/websockets"
import { validate } from "class-validator"
import { plainToClass } from "class-transformer"
import { PlaceBidDto } from "../dto/websocket.dto"

@Injectable()
export class BidValidationPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== "body") {
      return value
    }

    const object = plainToClass(PlaceBidDto, value)
    const errors = await validate(object)

    if (errors.length > 0) {
      const errorMessages = errors.map((error) => Object.values(error.constraints || {}).join(", ")).join("; ")

      throw new WsException(`Validation failed: ${errorMessages}`)
    }

    // Additional bid-specific validations
    if (object.amount <= 0) {
      throw new WsException("Bid amount must be greater than 0")
    }

    if (object.amount > 10000000) {
      // 10 million limit
      throw new WsException("Bid amount exceeds maximum limit")
    }

    // Check for decimal places (only whole Dirhams allowed)
    if (object.amount % 1 !== 0) {
      throw new WsException("Bid amount must be a whole number")
    }

    return object
  }
}
