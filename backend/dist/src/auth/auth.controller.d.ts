import { AuthService } from "./auth.service";
import { CreateUserDto } from "../user/dto/create-user.dto";
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(createUserDto: CreateUserDto): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            username: any;
        };
    }>;
    login(req: any): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            username: any;
        };
    }>;
}
