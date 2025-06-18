import { Injectable } from "@nestjs/common"
import type { JwtService } from "@nestjs/jwt"
import type { UserService } from "../user/user.service"
import * as bcrypt from "bcrypt"

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findByEmail(email)
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user
      return result
    }
    return null
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id }
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    }
  }

  async register(createUserDto: any) {
    const user = await this.userService.create(createUserDto)
    return this.login(user)
  }
}
