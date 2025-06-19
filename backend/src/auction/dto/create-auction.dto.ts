import { IsNotEmpty, IsString, IsNumber, IsDateString, Min } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class CreateAuctionDto {
  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "The ID of the car to auction",
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  carId!: string

  @ApiProperty({
    example: "2023-06-01T12:00:00Z",
    description: "When the auction should start",
    required: true,
  })
  @IsDateString()
  @IsNotEmpty()
  startTime!: string

  @ApiProperty({
    example: "2023-06-02T12:00:00Z",
    description: "When the auction should end",
    required: true,
  })
  @IsDateString()
  @IsNotEmpty()
  endTime!: string

  @ApiProperty({
    example: 5000,
    description: "Starting bid amount in AED Dirhams",
    minimum: 0,
    required: true,
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  startingBid!: number
}
