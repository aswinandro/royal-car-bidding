"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitMQModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const rabbitmq_service_1 = require("./rabbitmq.service");
const bid_processor_service_1 = require("./consumers/bid-processor.service");
const notification_processor_service_1 = require("./consumers/notification-processor.service");
const audit_processor_service_1 = require("./consumers/audit-processor.service");
const dead_letter_processor_service_1 = require("./consumers/dead-letter-processor.service");
const bid_module_1 = require("../bid/bid.module");
const websocket_module_1 = require("../websocket/websocket.module");
let RabbitMQModule = class RabbitMQModule {
};
exports.RabbitMQModule = RabbitMQModule;
exports.RabbitMQModule = RabbitMQModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            (0, common_1.forwardRef)(() => bid_module_1.BidModule),
            (0, common_1.forwardRef)(() => websocket_module_1.WebsocketModule),
        ],
        providers: [
            {
                provide: rabbitmq_service_1.RabbitMQService,
                useFactory: (configService) => {
                    return new rabbitmq_service_1.RabbitMQService(configService);
                },
                inject: [config_1.ConfigService],
            },
            bid_processor_service_1.BidProcessorService,
            notification_processor_service_1.NotificationProcessorService,
            audit_processor_service_1.AuditProcessorService,
            dead_letter_processor_service_1.DeadLetterProcessorService,
        ],
        exports: [rabbitmq_service_1.RabbitMQService],
    })
], RabbitMQModule);
//# sourceMappingURL=rabbitmq.module.js.map