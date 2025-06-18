import { IsNotEmpty, IsString, IsNumber, Min } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class CreateBidDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsString()
  @IsNotEmpty()
  auctionId: string

  @ApiProperty({ example: 5500 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number
}
