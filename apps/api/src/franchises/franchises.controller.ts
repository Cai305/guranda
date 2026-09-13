import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FranchisesService } from './franchises.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CreateFranchiseAliasDto } from './dto/create-franchise-alias.dto';
import { AddFranchiseStaffDto } from './dto/add-franchise-staff.dto';
import { SetBrandRootDto } from './dto/set-brand-root.dto';

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(JwtAuthGuard)
@Controller('franchises')
export class FranchisesController {
  constructor(private readonly franchises: FranchisesService) {}

  // Used by the mobile "Create Franchise Location" flow to pre-check which
  // business (if any) the caller can create franchises under, before
  // showing the form.
  @Get('my-business')
  async myBusiness(@Request() req: any) {
    const business = await this.franchises.findEligibleBusiness(req.user.userId);
    return { business };
  }

  // Used by the mobile campaign-creation "which location?" picker for staff
  // members, who don't own the business and so can't discover their
  // franchise via /franchises/my-business.
  @Get('my-staff-memberships')
  myStaffMemberships(@Request() req: any) {
    return this.franchises.myStaffMemberships(req.user.userId);
  }

  @Get('business/:businessId/hierarchy')
  hierarchy(@Request() req: any, @Param('businessId') businessId: string) {
    return this.franchises.getFranchiseHierarchy(req.user.userId, businessId);
  }

  @Post('brand-root')
  setBrandRoot(@Request() req: any, @Body() body: SetBrandRootDto) {
    return this.franchises.setBrandRootAlias(req.user.userId, body.businessId, body.usernameId);
  }

  @Post('alias')
  createAlias(@Request() req: any, @Body() body: CreateFranchiseAliasDto) {
    return this.franchises.createFranchiseAlias(
      req.user.userId,
      body.businessId,
      body.parentUsernameId,
      body.newAliasName,
    );
  }

  // Resolves "@handle" -> userId for the staff-management UI, so an owner
  // can add staff by typing a username instead of pasting a raw id.
  @Get('resolve-user')
  async resolveUser(@Query('username') username: string) {
    const userId = await this.franchises.findUserIdByUsername(username || '');
    if (!userId) throw new NotFoundException('No user with that username');
    return { userId };
  }

  @Get(':franchiseUsernameId/staff')
  listStaff(@Request() req: any, @Param('franchiseUsernameId') franchiseUsernameId: string) {
    return this.franchises.listFranchiseStaff(req.user.userId, franchiseUsernameId);
  }

  @Post(':franchiseUsernameId/staff')
  addStaff(
    @Request() req: any,
    @Param('franchiseUsernameId') franchiseUsernameId: string,
    @Body() body: AddFranchiseStaffDto,
  ) {
    return this.franchises.addFranchiseStaff(
      req.user.userId,
      franchiseUsernameId,
      body.targetUserId,
      body.role,
    );
  }

  @Delete('staff/:staffId')
  removeStaff(@Request() req: any, @Param('staffId') staffId: string) {
    return this.franchises.removeFranchiseStaff(req.user.userId, staffId);
  }

  // Lets a client check "can I act as this alias" before showing a
  // franchise-scoped composer (e.g. campaign creation) — same check
  // CampaignsService.create() enforces server-side, exposed read-only.
  @Get(':usernameId/can-act')
  async canAct(@Request() req: any, @Param('usernameId') usernameId: string) {
    const canAct = await this.franchises.canActAsAlias(req.user.userId, usernameId);
    return { canAct };
  }
}
