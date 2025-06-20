import { Controller, Post, Body, UseGuards, Request } from "@nestjs/common"
import { AuthService } from "./auth.service"
import { CreateUserDto } from "../user/dto/create-user.dto"
import { LocalAuthGuard } from "./guards/local-auth.guard"
import { ApiTags } from "@nestjs/swagger"

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }
}
