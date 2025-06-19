# Car Auction System - Real-Time Bidding Platform

A comprehensive real-time car auction system built with NestJS, React, PostgreSQL, Redis, and RabbitMQ. Features live bidding, WebSocket communication, comprehensive DDoS protection, and enterprise-grade message queuing.

## 🚀 Features Overview

### 🏗️ Architecture
- **Backend**: NestJS with TypeScript, Prisma ORM, Socket.IO
- **Frontend**: React 18 with TypeScript, TailwindCSS, Vite
- **Database**: PostgreSQL with Prisma migrations
- **Cache**: Redis for session management and real-time data
- **Message Queue**: RabbitMQ for reliable event processing
- **Real-time**: WebSocket Gateway with Socket.IO
- **Security**: JWT authentication, DDoS protection, rate limiting

### 🔄 Real-Time Communication
- **WebSocket Gateway**: Live bidding with instant updates
- **Message Queuing**: Reliable bid processing with RabbitMQ
- **Redis Pub/Sub**: Real-time notifications and caching
- **Event-Driven**: Asynchronous processing for scalability

### 🛡️ Security & Protection
- **DDoS Protection**: Multi-layer rate limiting and throttling
- **Authentication**: JWT-based with Passport strategies
- **Input Validation**: Class-validator with custom pipes
- **CORS Configuration**: Secure cross-origin requests

## 📋 Prerequisites

- **Node.js** 18+ 
- **Docker** and **Docker Compose**
- **PostgreSQL** 15+ (if running locally)
- **Redis** 7+ (if running locally)
- **RabbitMQ** 3+ (if running locally)

## 🛠️ Quick Start

### 1. Clone and Install

\`\`\`bash
git clone <repository-url>
cd car-auction-system

# Install all dependencies
npm run install:all
\`\`\`

### 2. Environment Setup

Create environment files:

**Backend** (`.env` in `/backend`):
\`\`\`env
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/car_auction"

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1d

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# DDoS Protection & Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10

# Logging
LOG_LEVEL=debug
\`\`\`

**Frontend** (`.env` in `/frontend`):
\`\`\`env
# Backend API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001

# App Configuration
VITE_APP_NAME=Car Auction System
VITE_APP_VERSION=1.0.0

# Development Configuration
VITE_DEV_PORT=5173
VITE_NODE_ENV=development
\`\`\`

### 3. Start with Docker (Recommended)

\`\`\`bash
# Start all services (PostgreSQL, Redis, RabbitMQ, Backend, Frontend)
npm run docker:up

# View logs
docker-compose logs -f

# Stop services
npm run docker:down
\`\`\`

**Access Points:**
- 🌐 **Frontend**: http://localhost:3000
- 🔧 **Backend API**: http://localhost:3001
- 📚 **API Documentation**: http://localhost:3001/api
- 🐰 **RabbitMQ Management**: http://localhost:15672 (guest/guest)
- 🔴 **Redis**: localhost:6379
- 🐘 **PostgreSQL**: localhost:5432

### 4. Database Setup

\`\`\`bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Open Prisma Studio
npm run db:studio
\`\`\`

## 🏛️ System Architecture

### Component Overview

\`\`\`
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   NestJS API    │    │   PostgreSQL    │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       
         │              ┌─────────────────┐              
         │              │     Redis       │              
         └──────────────►│ (Cache/Pub/Sub) │              
                        └─────────────────┘              
                                 │                       
                        ┌─────────────────┐              
                        │   RabbitMQ      │              
                        │ (Message Queue) │              
                        └─────────────────┘              
\`\`\`

### Real-Time Communication Flow

\`\`\`
┌─────────────┐    WebSocket    ┌─────────────┐    RabbitMQ    ┌─────────────┐
│   Client    │◄──────────────►│   Gateway   │◄─────────────►│   Queue     │
│   (React)   │                │  (Socket.IO)│               │ (Processing)│
└─────────────┘                └─────────────┘               └─────────────┘
       │                              │                             │
       │                              │                             │
       ▼                              ▼                             ▼
┌─────────────┐                ┌─────────────┐               ┌─────────────┐
│    Redis    │                │   Auction   │               │    Bid      │
│   (Cache)   │                │   Rooms     │               │ Processing  │
└─────────────┘                └─────────────┘               └─────────────┘
\`\`\`

## 🗄️ Database Schema (Prisma)

### Core Tables

\`\`\`sql
-- Users Table
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  username  String   @unique
  password  String   // bcrypt hashed
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  bids        Bid[]
  auctions    Auction[] @relation("AuctionOwner")
  wonAuctions Auction[] @relation("AuctionWinner")
  auditLogs   AuditLog[]
}

-- Cars Table
model Car {
  id          String   @id @default(uuid())
  make        String
  model       String
  year        Int
  description String
  imageUrl    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  auctions Auction[]
}

-- Auctions Table
model Auction {
  id          String    @id @default(uuid())
  carId       String
  ownerId     String
  startTime   DateTime
  endTime     DateTime
  startingBid Float
  currentBid  Float?
  winnerId    String?
  status      String    @default("PENDING") // PENDING, ACTIVE, ENDED
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  car       Car       @relation(fields: [carId], references: [id], onDelete: Cascade)
  owner     User      @relation("AuctionOwner", fields: [ownerId], references: [id])
  winner    User?     @relation("AuctionWinner", fields: [winnerId], references: [id])
  bids      Bid[]
  auditLogs AuditLog[]

  // Indexes for performance
  @@index([status])
  @@index([startTime])
  @@index([endTime])
}

-- Bids Table
model Bid {
  id        String   @id @default(uuid())
  userId    String
  auctionId String
  amount    Float
  createdAt DateTime @default(now())

  // Relations
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  auction   Auction   @relation(fields: [auctionId], references: [id], onDelete: Cascade)
  auditLogs AuditLog[]

  // Indexes for performance
  @@index([auctionId])
  @@index([userId])
  @@index([amount])
}

-- Audit Logs Table
model AuditLog {
  id        String   @id @default(uuid())
  eventType String   // bid_placed, auction_created, auction_ended, etc.
  userId    String?
  auctionId String?
  bidId     String?
  data      Json     // Event-specific data
  timestamp DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  // Relations
  user    User?    @relation(fields: [userId], references: [id])
  auction Auction? @relation(fields: [auctionId], references: [id])
  bid     Bid?     @relation(fields: [bidId], references: [id])

  // Indexes for auditing and compliance
  @@index([eventType])
  @@index([userId])
  @@index([auctionId])
  @@index([timestamp])
}
\`\`\`

### Database Relationships

- **User → Auctions**: One-to-many (owner relationship)
- **User → Bids**: One-to-many (bidder relationship)
- **User → Won Auctions**: One-to-many (winner relationship)
- **Car → Auctions**: One-to-many
- **Auction → Bids**: One-to-many
- **Audit Logs**: References to User, Auction, and Bid for compliance

## 🔌 WebSocket Gateway Events

### Client → Server Events

#### Authentication & Room Management
\`\`\`typescript
// Join auction room
socket.emit('joinAuction', { auctionId: 'uuid' })

// Leave auction room
socket.emit('leaveAuction', { auctionId: 'uuid' })

// Get auction status
socket.emit('getAuctionStatus', { auctionId: 'uuid' })

// Get room participants
socket.emit('getRoomParticipants', { auctionId: 'uuid' })
\`\`\`

#### Bidding Operations
\`\`\`typescript
// Place bid (requires authentication)
socket.emit('placeBid', { 
  auctionId: 'uuid', 
  amount: 5000 
})
\`\`\`

#### Auction Management (Owner/Admin Only)
\`\`\`typescript
// Start auction
socket.emit('startAuction', { auctionId: 'uuid' })

// End auction
socket.emit('endAuction', { auctionId: 'uuid' })
\`\`\`

### Server → Client Events

#### Connection Events
\`\`\`typescript
// Connection confirmation
socket.on('connected', (data) => {
  // { message, userId, timestamp }
})

// Room events
socket.on('joinedAuction', (data) => {
  // { auctionId, roomInfo, timestamp }
})

socket.on('leftAuction', (data) => {
  // { auctionId, timestamp }
})
\`\`\`

#### Real-Time Bidding
\`\`\`typescript
// New bid placed
socket.on('bidPlaced', (data) => {
  // { bidId, auctionId, userId, username, amount, timestamp, isHighest, previousHighest }
})

// Bid confirmation (to bidder)
socket.on('bidConfirmed', (data) => {
  // { bidId, amount, position, timestamp }
})

// Bid error
socket.on('bidError', (data) => {
  // { auctionId, error, timestamp }
})
\`\`\`

#### Auction Events
\`\`\`typescript
// Auction status updates
socket.on('auctionUpdate', (data) => {
  // { auctionId, status, timestamp }
})

// Auction started
socket.on('auctionStarted', (data) => {
  // { auctionId, startedBy, timestamp }
})

// Auction ended
socket.on('auctionEnded', (data) => {
  // { auctionId, winner, winningBid, endedBy, timestamp }
})
\`\`\`

#### Room Management
\`\`\`typescript
// User joined room
socket.on('userJoined', (data) => {
  // { userId, username, participantCount, timestamp }
})

// User left room
socket.on('userLeft', (data) => {
  // { userId, username, timestamp }
})
\`\`\`

## 🐰 RabbitMQ Message Queues

### Queue Architecture

\`\`\`
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Bid Processing    │    │   Notifications     │    │   Audit Events      │
│      Queues         │    │      Queue          │    │      Queue          │
├─────────────────────┤    ├─────────────────────┤    ├─────────────────────┤
│ • bid.processing    │    │ • notification.queue│    │ • audit.queue       │
│ • bid.priority      │    │ • user.broadcast    │    │ • compliance.logs   │
│ • bid.retry         │    │ • user.{userId}     │    │ • system.events     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                           │                           │
           ▼                           ▼                           ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Dead Letter       │    │   Email/SMS         │    │   Compliance        │
│      Queue          │    │    Services         │    │    Database         │
├─────────────────────┤    ├─────────────────────┤    ├─────────────────────┤
│ • dead.letter.queue │    │ • email.queue       │    │ • audit.storage     │
│ • failed.messages   │    │ • sms.queue         │    │ • regulatory.logs   │
│ • retry.exhausted   │    │ • push.notifications│    │ • compliance.export │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
\`\`\`

### Queue Names and Purposes

#### Bid Processing Queues
\`\`\`typescript
// Primary bid processing
BID_PROCESSING_QUEUE = "bid.processing"
// High-priority bids (last-minute, high-value)
BID_PRIORITY_QUEUE = "bid.priority"
// Failed bid retry queue
RETRY_QUEUE = "retry.queue"
\`\`\`

#### Notification Queues
\`\`\`typescript
// User-specific notifications
NOTIFICATION_QUEUE = "notification.queue"
// Broadcast notifications
BROADCAST_QUEUE = "notification.broadcast"
\`\`\`

#### Audit and Compliance
\`\`\`typescript
// Audit event logging
AUDIT_QUEUE = "audit.queue"
// Dead letter for failed messages
DEAD_LETTER_QUEUE = "dead.letter.queue"
\`\`\`

### Exchange Configuration

#### Auction Events Exchange
\`\`\`typescript
AUCTION_EXCHANGE = "auction.events" // Type: topic
// Routing keys:
// - bid.placed
// - bid.priority
// - auction.started
// - auction.ended
// - auction.updated
\`\`\`

#### Notification Exchange
\`\`\`typescript
NOTIFICATION_EXCHANGE = "notifications" // Type: direct
// Routing keys:
// - user.{userId}
// - user.broadcast
\`\`\`

#### Audit Exchange
\`\`\`typescript
AUDIT_EXCHANGE = "audit.events" // Type: fanout
// All audit events broadcast to all consumers
\`\`\`

### Message Types

#### Bid Message
\`\`\`typescript
interface BidMessage {
  bidId: string
  userId: string
  auctionId: string
  amount: number
  timestamp: string
  retryCount?: number
}
\`\`\`

#### Notification Message
\`\`\`typescript
interface NotificationMessage {
  userId: string
  type: "bid_placed" | "auction_won" | "auction_lost" | "auction_started" | "auction_ended"
  title: string
  message: string
  data: any
  timestamp: string
}
\`\`\`

#### Audit Message
\`\`\`typescript
interface AuditMessage {
  eventType: string
  userId?: string
  auctionId?: string
  bidId?: string
  data: any
  timestamp: string
  ipAddress?: string
  userAgent?: string
}
\`\`\`

## 🔴 Redis Caching Strategy

### Cache Structure

\`\`\`
Redis Key Patterns:
├── auction:{auctionId}:highestBid     # Current highest bid cache
├── auction:room:{auctionId}           # Room participant info
├── user:session:{userId}              # User session data
├── bid:lock:{auctionId}              # Bid processing locks
├── throttle:ws:{userId}:{event}       # WebSocket rate limiting
├── throttle:api:{userId}:{endpoint}   # API rate limiting
└── stats:auction:{auctionId}          # Auction statistics
\`\`\`

### Caching Operations

#### Highest Bid Caching
\`\`\`typescript
// Cache highest bid for fast access
await redisService.cacheHighestBid(auctionId, amount, userId)

// Retrieve cached highest bid
const highestBid = await redisService.getHighestBid(auctionId)
// Returns: { amount: number, userId: string } | null
\`\`\`

#### Session Management
\`\`\`typescript
// Cache user session
await redisService.set(`user:session:${userId}`, sessionData, 3600)

// Retrieve session
const session = await redisService.get(`user:session:${userId}`)
\`\`\`

#### Rate Limiting
\`\`\`typescript
// WebSocket throttling
const key = `throttle:ws:${userId}:placeBid`
const current = await redisService.get(key)
if (current && parseInt(current) >= limit) {
  throw new WsException("Rate limit exceeded")
}
\`\`\`

### Pub/Sub for Real-Time Updates

\`\`\`typescript
// Publish auction updates
await redisService.publish(`auction:${auctionId}`, JSON.stringify({
  type: 'bid_placed',
  data: bidData
}))

// Subscribe to auction updates
await redisService.subscribe(`auction:${auctionId}`, (message) => {
  const update = JSON.parse(message)
  // Broadcast to WebSocket clients
})
\`\`\`

## 🛡️ DDoS Protection & Security

### Multi-Layer Protection

#### 1. Global Rate Limiting (Throttler)
\`\`\`typescript
// Configuration in app.module.ts
ThrottlerModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    ttl: Number(configService.get("THROTTLE_TTL", "60")), // 60 seconds
    limit: Number(configService.get("THROTTLE_LIMIT", "10")), // 10 requests
  }),
})
\`\`\`

#### 2. WebSocket Throttling
\`\`\`typescript
// Per-user, per-event throttling
@UseGuards(WsThrottlerGuard)
@SubscribeMessage('placeBid')
async handlePlaceBid() {
  // Rate limited: 5 bids per second per user
}
\`\`\`

#### 3. API Endpoint Protection
\`\`\`typescript
// Custom throttler guard
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): string {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.id || req.ip
  }
}
\`\`\`

#### 4. Bid Processing Locks
\`\`\`typescript
// Redis-based locking for bid processing
const lockKey = `bid:lock:${auctionId}`
const lockAcquired = await this.acquireLock(lockKey, 5000) // 5 second lock

if (!lockAcquired) {
  throw new Error("Could not acquire bid processing lock")
}
\`\`\`

### Security Headers & CORS

\`\`\`typescript
// Helmet security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}))

// CORS configuration
app.enableCors({
  origin: [frontendUrl, "http://localhost:3000", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
})
\`\`\`

## 🔐 Authentication & Authorization

### JWT Configuration

\`\`\`typescript
// JWT Module setup
JwtModule.registerAsync({
  useFactory: (configService: ConfigService) => ({
    secret: configService.get("JWT_SECRET") || "fallback-secret-key",
    signOptions: {
      expiresIn: configService.get("JWT_EXPIRES_IN") || "1d",
    },
  }),
})
\`\`\`

### Authentication Flow

1. **User Registration/Login** → JWT Token issued
2. **API Requests** → Bearer token in Authorization header
3. **WebSocket Connection** → Token in auth handshake
4. **Token Validation** → JWT Strategy validates and extracts user info

### Guards and Strategies

\`\`\`typescript
// JWT Strategy for API routes
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
    }
  }
}

// WebSocket JWT Guard
@Injectable()
export class WsJwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient()
    const token = client.handshake.auth.token
    // Validate token and set user data
  }
}
\`\`\`

## 📡 API Endpoints

### Authentication Endpoints
\`\`\`
POST /auth/register    # User registration
POST /auth/login       # User login
\`\`\`

### Auction Management
\`\`\`
GET    /auctions              # List auctions (with status filter)
GET    /auctions/:id          # Get auction details
POST   /auctions              # Create new auction (authenticated)
PATCH  /auctions/:id          # Update auction (owner only)
DELETE /auctions/:id          # Delete auction (owner only)
POST   /auctions/:id/start    # Start auction (owner only)
POST   /auctions/:id/end      # End auction (owner only)
\`\`\`

### Bid Management
\`\`\`
POST /bids                           # Place bid (authenticated)
GET  /bids/auction/:auctionId        # Get auction bids
GET  /bids/auction/:auctionId/highest # Get highest bid
\`\`\`

### User Management
\`\`\`
GET    /users     # List users (authenticated)
GET    /users/:id # Get user details (authenticated)
PATCH  /users/:id # Update user (owner only)
DELETE /users/:id # Delete user (owner only)
\`\`\`

### System Endpoints
\`\`\`
GET /health # Health check endpoint
GET /api    # Swagger documentation
\`\`\`

## 🔧 Environment Variables Reference

### Backend Environment Variables

#### Database Configuration
\`\`\`env
DATABASE_URL="postgresql://user:password@host:port/database"
\`\`\`

#### Redis Configuration
\`\`\`env
REDIS_HOST=localhost          # Redis server host
REDIS_PORT=6379              # Redis server port
REDIS_PASSWORD=              # Redis password (optional)
\`\`\`

#### RabbitMQ Configuration
\`\`\`env
RABBITMQ_URL=amqp://localhost:5672  # RabbitMQ connection URL
RABBITMQ_USERNAME=guest             # RabbitMQ username
RABBITMQ_PASSWORD=guest             # RabbitMQ password
\`\`\`

#### JWT & Security
\`\`\`env
JWT_SECRET=your-secret-key          # JWT signing secret (CHANGE IN PRODUCTION)
JWT_EXPIRES_IN=1d                   # Token expiration time
\`\`\`

#### Server Configuration
\`\`\`env
PORT=3001                           # Server port
NODE_ENV=development                # Environment (development/production)
FRONTEND_URL=http://localhost:5173  # Frontend URL for CORS
\`\`\`

#### DDoS Protection
\`\`\`env
THROTTLE_TTL=60                     # Rate limit time window (seconds)
THROTTLE_LIMIT=10                   # Max requests per time window
\`\`\`

#### Logging
\`\`\`env
LOG_LEVEL=debug                     # Logging level (error/warn/info/debug)
\`\`\`

### Frontend Environment Variables

#### API Configuration
\`\`\`env
VITE_API_URL=http://localhost:3001  # Backend API URL
VITE_WS_URL=http://localhost:3001   # WebSocket server URL
\`\`\`

#### App Configuration
\`\`\`env
VITE_APP_NAME=Car Auction System   # Application name
VITE_APP_VERSION=1.0.0             # Application version
\`\`\`

#### Development
\`\`\`env
VITE_DEV_PORT=5173                 # Development server port
VITE_NODE_ENV=development          # Environment
\`\`\`

## 🚀 Deployment

### Production Environment Setup

#### Backend Production Variables
\`\`\`env
DATABASE_URL=postgresql://user:pass@prod-host:5432/db
REDIS_HOST=prod-redis-host
REDIS_PORT=6379
RABBITMQ_URL=amqp://prod-rabbitmq:5672
JWT_SECRET=production-secret-key-256-bits-minimum
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
THROTTLE_TTL=60
THROTTLE_LIMIT=100
LOG_LEVEL=warn
\`\`\`

#### Frontend Production Variables
\`\`\`env
VITE_API_URL=https://api.your-domain.com
VITE_WS_URL=https://api.your-domain.com
VITE_APP_NAME=Car Auction System
\`\`\`

### Docker Production Deployment

\`\`\`bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with production configuration
docker-compose -f docker-compose.prod.yml up -d

# Monitor logs
docker-compose -f docker-compose.prod.yml logs -f
\`\`\`

### Health Monitoring

\`\`\`bash
# Check application health
curl http://localhost:3001/health

# Monitor queue statistics
curl http://localhost:15672/api/queues (RabbitMQ Management)

# Redis monitoring
redis-cli info stats
\`\`\`

## 🧪 Testing

### Backend Testing
\`\`\`bash
# Run all tests
npm run test:backend

# Run with coverage
cd backend && npm run test:cov

# Run e2e tests
cd backend && npm run test:e2e
\`\`\`

### Load Testing WebSocket Connections
\`\`\`bash
# Test concurrent connections
npm run test:websocket:load

# Test bid processing under load
npm run test:bid:stress
\`\`\`

## 📊 Monitoring & Observability

### Application Metrics
- **WebSocket Connections**: Active connections, connection rate
- **Queue Statistics**: Message count, processing rate, dead letters
- **Database Performance**: Query time, connection pool usage
- **Redis Performance**: Cache hit rate, memory usage
- **API Response Times**: Endpoint performance metrics

### Logging Strategy
- **Structured Logging**: JSON format with correlation IDs
- **Log Levels**: Error, Warn, Info, Debug
- **Audit Trail**: All bid placements and auction events logged
- **Performance Logs**: Slow query detection, high memory usage alerts

### Health Checks
\`\`\`typescript
// Built-in health check endpoints
GET /health                    # Application health
GET /health/database          # Database connectivity
GET /health/redis             # Redis connectivity
GET /health/rabbitmq          # RabbitMQ connectivity
\`\`\`

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper tests
4. Ensure all tests pass (`npm run test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks
- **Conventional Commits**: Commit message format

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

#### WebSocket Connection Issues
\`\`\`bash
# Check CORS configuration
# Verify JWT token in handshake
# Ensure WebSocket URL is correct
\`\`\`

#### RabbitMQ Connection Problems
\`\`\`bash
# Verify RabbitMQ is running
docker-compose ps rabbitmq

# Check queue statistics
curl http://localhost:15672/api/queues
\`\`\`

#### Redis Connection Issues
\`\`\`bash
# Test Redis connectivity
redis-cli ping

# Check Redis logs
docker-compose logs redis
\`\`\`

#### Database Migration Issues
\`\`\`bash
# Reset database (development only)
npm run db:reset

# Run migrations manually
npx prisma migrate dev
\`\`\`

### Performance Optimization

#### Database Optimization
- **Indexes**: Proper indexing on auction status, timestamps
- **Connection Pooling**: Optimized Prisma connection pool
- **Query Optimization**: Efficient joins and filtering

#### Redis Optimization
- **Memory Management**: TTL on cached data
- **Connection Pooling**: Redis connection reuse
- **Pub/Sub Optimization**: Efficient channel management

#### RabbitMQ Optimization
- **Queue Configuration**: Proper TTL and dead letter handling
- **Message Persistence**: Durable queues for critical messages
- **Consumer Scaling**: Multiple consumers for high throughput

## 🙏 Acknowledgments

- **Royal Class**: Thanks for providing me this opportunity .


---

**Built with ❤️ for real-time auction experiences**

For more detailed information, check the inline code documentation and API documentation at `/api` endpoint.
