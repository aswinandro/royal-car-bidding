import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { ValidationPipe } from "@nestjs/common"
import helmet from "helmet"
import * as compression from "compression"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { ConfigService } from "@nestjs/config"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )

  // Security middleware
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
    }),
  )

  // Compression
  app.use(compression())

  // CORS configuration
  const frontendUrl = configService.get("FRONTEND_URL") || "http://localhost:5173"
  app.enableCors({
    origin: [frontendUrl, "http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle("Car Auction API")
    .setDescription("API for real-time car auction system with live bidding")
    .setVersion("1.0")
    .addBearerAuth()
    .addTag("auth", "Authentication endpoints")
    .addTag("users", "User management")
    .addTag("auctions", "Auction management")
    .addTag("bids", "Bid management")
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup("api", app, document)

  // Health check endpoint
  app.getHttpAdapter().get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  })

  const port = configService.get("PORT") || 3001
  await app.listen(port, "0.0.0.0")

  console.log(`🚀 Application is running on: http://localhost:${port}`)
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`)
  console.log(`🏥 Health check: http://localhost:${port}/health`)
  console.log(`🌐 Frontend URL: ${frontendUrl}`)
}

bootstrap().catch((error) => {
  console.error("❌ Error starting application:", error)
  process.exit(1)
})
