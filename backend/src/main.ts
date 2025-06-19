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
  app.useGlobalPipes(new ValidationPipe({ transform: true }))

  // Security middleware
  app.use(helmet())

  // Compression
  app.use(compression())

  // CORS
  app.enableCors({
    origin: configService.get("FRONTEND_URL") || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle("Car Auction API")
    .setDescription("API for real-time car auction system")
    .setVersion("1.0")
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup("api", app, document)

  const port = configService.get("PORT") || 3001
  await app.listen(port)
  console.log(`Application is running on: http://localhost:${port}`)
  console.log(`Swagger documentation: http://localhost:${port}/api`)
}
bootstrap()
