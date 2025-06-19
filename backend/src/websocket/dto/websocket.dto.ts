import { IsString, IsNotEmpty, IsNumber, Min, IsUUID } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class JoinRoomDto {
  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "The auction ID to join",
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  auctionId!: string
}

export class LeaveRoomDto {
  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "The auction ID to leave",
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  auctionId!: string
}

export class PlaceBidDto {
  @ApiProperty({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "The auction ID to bid on",
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  auctionId!: string

  @ApiProperty({
    example: 5500,
    description: "Bid amount in AED Dirhams",
    minimum: 1,
    required: true,
  })
  @IsNumber()
  @Min(1)
  amount!: number
}
