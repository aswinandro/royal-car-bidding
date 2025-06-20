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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuctionController = void 0;
const common_1 = require("@nestjs/common");
const auction_service_1 = require("./auction.service");
const create_auction_dto_1 = require("./dto/create-auction.dto");
const update_auction_dto_1 = require("./dto/update-auction.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
let AuctionController = class AuctionController {
    constructor(auctionService) {
        this.auctionService = auctionService;
    }
    create(createAuctionDto, req) {
        return this.auctionService.create(createAuctionDto, req.user.id);
    }
    findAll(status) {
        return this.auctionService.findAll(status);
    }
    findOne(id) {
        return this.auctionService.findOne(id);
    }
    update(id, updateAuctionDto, req) {
        return this.auctionService.update(id, updateAuctionDto, req.user.id);
    }
    remove(id, req) {
        return this.auctionService.remove(id, req.user.id);
    }
    startAuction(id) {
        return this.auctionService.startAuction(id);
    }
    endAuction(id) {
        return this.auctionService.endAuction(id);
    }
};
exports.AuctionController = AuctionController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_auction_dto_1.CreateAuctionDto, Object]),
    __metadata("design:returntype", void 0)
], AuctionController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: ['PENDING', 'ACTIVE', 'ENDED'] }),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuctionController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuctionController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(":id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_auction_dto_1.UpdateAuctionDto, Object]),
    __metadata("design:returntype", void 0)
], AuctionController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AuctionController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/start'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuctionController.prototype, "startAuction", null);
__decorate([
    (0, common_1.Post)(':id/end'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuctionController.prototype, "endAuction", null);
exports.AuctionController = AuctionController = __decorate([
    (0, swagger_1.ApiTags)("auctions"),
    (0, common_1.Controller)("auctions"),
    __metadata("design:paramtypes", [auction_service_1.AuctionService])
], AuctionController);
//# sourceMappingURL=auction.controller.js.map