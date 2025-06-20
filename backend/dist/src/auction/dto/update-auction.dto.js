"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateAuctionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_auction_dto_1 = require("./create-auction.dto");
class UpdateAuctionDto extends (0, swagger_1.PartialType)(create_auction_dto_1.CreateAuctionDto) {
}
exports.UpdateAuctionDto = UpdateAuctionDto;
//# sourceMappingURL=update-auction.dto.js.map