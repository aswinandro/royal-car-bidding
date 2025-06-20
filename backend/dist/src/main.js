"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }));
    app.use((0, helmet_1.default)({
        crossOriginEmbedderPolicy: false,
    }));
    app.use((0, compression_1.default)());
    const frontendUrl = configService.get("FRONTEND_URL") || "http://localhost:5173";
    app.enableCors({
        origin: [frontendUrl, "http://localhost:3000", "http://localhost:5173"],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle("Car Auction API")
        .setDescription("API for real-time car auction system with live bidding")
        .setVersion("1.0")
        .addBearerAuth()
        .addTag("auth", "Authentication endpoints")
        .addTag("users", "User management")
        .addTag("auctions", "Auction management")
        .addTag("bids", "Bid management")
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup("api", app, document);
    app.getHttpAdapter().get("/health", (req, res) => {
        res.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });
    const port = configService.get("PORT") || 3001;
    await app.listen(port, "0.0.0.0");
    console.log(`🚀 Application is running on: http://localhost:${port}`);
    console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
    console.log(`🏥 Health check: http://localhost:${port}/health`);
    console.log(`🌐 Frontend URL: ${frontendUrl}`);
}
bootstrap().catch((error) => {
    console.error("❌ Error starting application:", error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map