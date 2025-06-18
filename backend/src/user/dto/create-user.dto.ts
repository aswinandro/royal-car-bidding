import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class CreateUserDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string

  @ApiProperty({ example: "johndoe" })
  @IsString()
  @IsNotEmpty()
  username: string

  @ApiProperty({ example: "Password123!" })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string
}
