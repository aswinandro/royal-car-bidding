import { JwtService } from "@nestjs/jwt";
import { UserService } from "../user/user.service";
export declare class AuthService {
    private readonly userService;
    private readonly jwtService;
    constructor(userService: UserService, jwtService: JwtService);
    validateUser(email: string, password: string): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            username: any;
        };
    }>;
    register(createUserDto: any): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            username: any;
        };
    }>;
}
