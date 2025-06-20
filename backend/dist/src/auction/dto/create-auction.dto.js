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
exports.CreateAuctionDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateAuctionDto {
}
exports.CreateAuctionDto = CreateAuctionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: "123e4567-e89b-12d3-a456-426614174000",
        description: "The ID of the car to auction",
        required: true,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateAuctionDto.prototype, "carId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: "2023-06-01T12:00:00Z",
        description: "When the auction should start",
        required: true,
    }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateAuctionDto.prototype, "startTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: "2023-06-02T12:00:00Z",
        description: "When the auction should end",
        required: true,
    }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateAuctionDto.prototype, "endTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 5000,
        description: "Starting bid amount in AED Dirhams",
        minimum: 0,
        required: true,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateAuctionDto.prototype, "startingBid", void 0);
//# sourceMappingURL=create-auction.dto.js.map