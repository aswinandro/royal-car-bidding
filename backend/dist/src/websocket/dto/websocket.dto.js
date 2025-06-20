"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaceBidDto = exports.LeaveRoomDto = exports.JoinRoomDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class JoinRoomDto {
}
exports.JoinRoomDto = JoinRoomDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: "123e4567-e89b-12d3-a456-426614174000",
        description: "The auction ID to join",
        required: true,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], JoinRoomDto.prototype, "auctionId", void 0);
class LeaveRoomDto {
}
exports.LeaveRoomDto = LeaveRoomDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: "123e4567-e89b-12d3-a456-426614174000",
        description: "The auction ID to leave",
        required: true,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], LeaveRoomDto.prototype, "auctionId", void 0);
class PlaceBidDto {
}
exports.PlaceBidDto = PlaceBidDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: "123e4567-e89b-12d3-a456-426614174000",
        description: "The auction ID to bid on",
        required: true,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PlaceBidDto.prototype, "auctionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 5500,
        description: "Bid amount in AED Dirhams",
        minimum: 1,
        required: true,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], PlaceBidDto.prototype, "amount", void 0);
//# sourceMappingURL=websocket.dto.js.map