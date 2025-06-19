import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class CreateUserDto {
  @ApiProperty({
    example: "user@example.com",
    description: "User's email address",
    required: true,
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string

  @ApiProperty({
    example: "johndoe",
    description: "Unique username",
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  username!: string

  @ApiProperty({
    example: "Password123!",
    description: "Password (minimum 8 characters)",
    minLength: 8,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string
}
