import { IsNotEmpty, IsString, IsNumber, IsDateString, Min } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class CreateAuctionDto {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsString()
  @IsNotEmpty()
  carId: string

  @ApiProperty({ example: "2023-06-01T12:00:00Z" })
  @IsDateString()
  @IsNotEmpty()
  startTime: string

  @ApiProperty({ example: "2023-06-02T12:00:00Z" })
  @IsDateString()
  @IsNotEmpty()
  endTime: string

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  startingBid: number
}
