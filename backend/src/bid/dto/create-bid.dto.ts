import { IsNotEmpty, IsString, IsNumber, Min } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class CreateBidDto {
  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "The ID of the auction to bid on",
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  auctionId!: string

  @ApiProperty({
    example: 5500,
    description: "Bid amount in dollars",
    minimum: 0,
    required: true,
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount!: number
}
