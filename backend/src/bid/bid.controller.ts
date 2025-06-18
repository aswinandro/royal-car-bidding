import { Controller, Get, Post, Body, Param, UseGuards, Request } from "@nestjs/common"
import type { BidService } from "./bid.service"
import type { CreateBidDto } from "./dto/create-bid.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"

@ApiTags("bids")
@Controller("bids")
export class BidController {
  constructor(private readonly bidService: BidService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  create(@Body() createBidDto: CreateBidDto, @Request() req) {
    return this.bidService.create(createBidDto, req.user.id)
  }

  @Get('auction/:auctionId')
  findByAuction(@Param('auctionId') auctionId: string) {
    return this.bidService.findByAuction(auctionId);
  }

  @Get('auction/:auctionId/highest')
  getHighestBid(@Param('auctionId') auctionId: string) {
    return this.bidService.getHighestBid(auctionId);
  }
}
