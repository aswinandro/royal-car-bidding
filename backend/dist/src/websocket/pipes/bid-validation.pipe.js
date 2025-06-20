"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidValidationPipe = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const websocket_dto_1 = require("../dto/websocket.dto");
let BidValidationPipe = class BidValidationPipe {
    async transform(value, metadata) {
        if (metadata.type !== "body") {
            return value;
        }
        const object = (0, class_transformer_1.plainToClass)(websocket_dto_1.PlaceBidDto, value);
        const errors = await (0, class_validator_1.validate)(object);
        if (errors.length > 0) {
            const errorMessages = errors.map((error) => Object.values(error.constraints || {}).join(", ")).join("; ");
            throw new websockets_1.WsException(`Validation failed: ${errorMessages}`);
        }
        if (object.amount <= 0) {
            throw new websockets_1.WsException("Bid amount must be greater than 0");
        }
        if (object.amount > 10000000) {
            throw new websockets_1.WsException("Bid amount exceeds maximum limit");
        }
        if (object.amount % 1 !== 0) {
            throw new websockets_1.WsException("Bid amount must be a whole number");
        }
        return object;
    }
};
exports.BidValidationPipe = BidValidationPipe;
exports.BidValidationPipe = BidValidationPipe = __decorate([
    (0, common_1.Injectable)()
], BidValidationPipe);
//# sourceMappingURL=bid-validation.pipe.js.map