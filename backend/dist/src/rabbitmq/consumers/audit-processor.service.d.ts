import { type OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "../rabbitmq.service";
import { PrismaService } from "../../prisma/prisma.service";
export declare class AuditProcessorService implements OnModuleInit {
    private readonly rabbitmqService;
    private readonly prismaService;
    private readonly logger;
    constructor(rabbitmqService: RabbitMQService, prismaService: PrismaService);
    onModuleInit(): Promise<void>;
    private startAuditProcessing;
    private processAuditEvent;
}
