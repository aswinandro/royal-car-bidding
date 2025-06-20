import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from "@nestjs/common"
import { AuctionService } from "./auction.service"
import { CreateAuctionDto } from "./dto/create-auction.dto"
import { UpdateAuctionDto } from "./dto/update-auction.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { ApiBearerAuth, ApiTags, ApiQuery } from "@nestjs/swagger"

@ApiTags("auctions")
@Controller("auctions")
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@Body() createAuctionDto: CreateAuctionDto, @Request() req) {
    return this.auctionService.create(createAuctionDto, req.user.id)
  }

  @Get()
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'ACTIVE', 'ENDED'] })
  findAll(@Query('status') status?: string) {
    return this.auctionService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auctionService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() updateAuctionDto: UpdateAuctionDto, @Request() req) {
    return this.auctionService.update(id, updateAuctionDto, req.user.id)
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string, @Request() req) {
    return this.auctionService.remove(id, req.user.id)
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  startAuction(@Param('id') id: string) {
    return this.auctionService.startAuction(id);
  }

  @Post(':id/end')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  endAuction(@Param('id') id: string) {
    return this.auctionService.endAuction(id);
  }
}
