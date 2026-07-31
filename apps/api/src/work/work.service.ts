import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class WorkService {
  constructor(private prisma: PrismaService) {}

  // ── Companies ("Businesses") ─────────────────────────────────────────────
  async createCompany(userId: string, dto: any) {
    const existing = await this.prisma.workCompany.findFirst({
      where: { ownerId: userId },
    });
    if (existing) throw new BadRequestException('You already have a company');
    if (!dto.name) throw new BadRequestException('Company name is required');
    return this.prisma.workCompany.create({
      data: {
        ownerId: userId,
        name: dto.name,
        description: dto.description || null,
        logoUrl: dto.logoUrl || null,
        website: dto.website || null,
        industry: dto.industry || null,
      },
    });
  }

  async listCompanies(industry?: string) {
    return this.prisma.workCompany.findMany({
      where: industry ? { industry } : {},
      include: {
        owner: { select: { id: true, username: true, profile: true } },
        _count: { select: { jobs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCompany(id: string) {
    const company = await this.prisma.workCompany.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true, profile: true } },
        jobs: { where: { status: 'OPEN' }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async getMyCompany(userId: string) {
    return this.prisma.workCompany.findFirst({
      where: { ownerId: userId },
      include: { jobs: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async updateCompany(userId: string, id: string, dto: any) {
    const company = await this.prisma.workCompany.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');
    if (company.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.workCompany.update({ where: { id }, data: dto });
  }

  // ── Jobs ─────────────────────────────────────────────────────────────────
  async createJob(userId: string, dto: any) {
    const company = await this.prisma.workCompany.findFirst({
      where: { ownerId: userId },
    });
    if (!company)
      throw new BadRequestException('Create a company before posting a job');
    if (!dto.title || !dto.description)
      throw new BadRequestException('Title and description are required');
    const VALID_LOCATION = ['Remote', 'Onsite', 'Hybrid'];
    const locationType = VALID_LOCATION.includes(dto.locationType)
      ? dto.locationType
      : 'Remote';
    if (locationType !== 'Remote' && !dto.location) {
      throw new BadRequestException(
        'Location is required for onsite/hybrid roles',
      );
    }
    return this.prisma.workJob.create({
      data: {
        companyId: company.id,
        postedById: userId,
        title: dto.title,
        description: dto.description,
        category: dto.category || null,
        employmentType: dto.employmentType || 'Full-time',
        locationType,
        location: dto.location || null,
        salaryMin: dto.salaryMin != null ? Number(dto.salaryMin) : null,
        salaryMax: dto.salaryMax != null ? Number(dto.salaryMax) : null,
      },
    });
  }

  async listJobs(filter: {
    locationType?: string;
    employmentType?: string;
    category?: string;
    search?: string;
  }) {
    return this.prisma.workJob.findMany({
      where: {
        status: 'OPEN',
        ...(filter.locationType ? { locationType: filter.locationType } : {}),
        ...(filter.employmentType
          ? { employmentType: filter.employmentType }
          : {}),
        ...(filter.category ? { category: filter.category } : {}),
        ...(filter.search
          ? { title: { contains: filter.search, mode: 'insensitive' } }
          : {}),
      },
      include: {
        company: {
          select: { id: true, name: true, logoUrl: true, industry: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getJob(id: string) {
    const job = await this.prisma.workJob.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            industry: true,
            website: true,
          },
        },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async getMyJobs(userId: string) {
    return this.prisma.workJob.findMany({
      where: { postedById: userId },
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateJob(userId: string, id: string, dto: any) {
    const job = await this.prisma.workJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.postedById !== userId) throw new ForbiddenException();
    return this.prisma.workJob.update({ where: { id }, data: dto });
  }

  // ── Job applications ─────────────────────────────────────────────────────
  async applyToJob(
    applicantId: string,
    jobId: string,
    dto: { coverMessage?: string; resumeUrl?: string },
  ) {
    const job = await this.prisma.workJob.findUnique({ where: { id: jobId } });
    if (!job || job.status !== 'OPEN')
      throw new NotFoundException('Job not found or closed');
    if (job.postedById === applicantId)
      throw new BadRequestException("You can't apply to your own job");
    const existing = await this.prisma.workJobApplication.findUnique({
      where: { jobId_applicantId: { jobId, applicantId } },
    });
    if (existing)
      throw new BadRequestException('You already applied to this job');
    return this.prisma.workJobApplication.create({
      data: {
        jobId,
        applicantId,
        coverMessage: dto.coverMessage || null,
        resumeUrl: dto.resumeUrl || null,
      },
    });
  }

  async getJobApplicants(userId: string, jobId: string) {
    const job = await this.prisma.workJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.postedById !== userId) throw new ForbiddenException();
    return this.prisma.workJobApplication.findMany({
      where: { jobId },
      include: {
        applicant: { select: { id: true, username: true, profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateApplicationStatus(
    userId: string,
    applicationId: string,
    status: string,
  ) {
    const VALID = ['PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED'];
    if (!VALID.includes(status))
      throw new BadRequestException('Invalid status');
    const application = await this.prisma.workJobApplication.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.job.postedById !== userId) throw new ForbiddenException();
    return this.prisma.workJobApplication.update({
      where: { id: applicationId },
      data: { status },
    });
  }

  async getMyApplications(userId: string) {
    return this.prisma.workJobApplication.findMany({
      where: { applicantId: userId },
      include: {
        job: {
          include: {
            company: { select: { id: true, name: true, logoUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Freelance gigs ───────────────────────────────────────────────────────
  async createGig(clientId: string, dto: any) {
    if (!dto.title || !dto.description || !(Number(dto.budget) > 0)) {
      throw new BadRequestException(
        'Title, description and a positive budget are required',
      );
    }
    return this.prisma.workGig.create({
      data: {
        clientId,
        title: dto.title,
        description: dto.description,
        category: dto.category || null,
        budget: Number(dto.budget),
        deadline: dto.deadline ? new Date(dto.deadline) : null,
      },
    });
  }

  async listGigs(filter: { category?: string; search?: string }) {
    return this.prisma.workGig.findMany({
      where: {
        status: 'OPEN',
        ...(filter.category ? { category: filter.category } : {}),
        ...(filter.search
          ? { title: { contains: filter.search, mode: 'insensitive' } }
          : {}),
      },
      include: {
        client: { select: { id: true, username: true, profile: true } },
        _count: { select: { proposals: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getGig(id: string) {
    const gig = await this.prisma.workGig.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, username: true, profile: true } },
        freelancer: { select: { id: true, username: true, profile: true } },
      },
    });
    if (!gig) throw new NotFoundException('Gig not found');
    return gig;
  }

  async getMyGigs(clientId: string) {
    return this.prisma.workGig.findMany({
      where: { clientId },
      include: {
        _count: { select: { proposals: true } },
        freelancer: { select: { id: true, username: true, profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyFreelanceWork(freelancerId: string) {
    return this.prisma.workGig.findMany({
      where: { freelancerId },
      include: {
        client: { select: { id: true, username: true, profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyProposals(freelancerId: string) {
    return this.prisma.workGigProposal.findMany({
      where: { freelancerId },
      include: {
        gig: {
          include: {
            client: { select: { id: true, username: true, profile: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async proposeForGig(
    freelancerId: string,
    gigId: string,
    dto: { message?: string; proposedBudget: number },
  ) {
    const gig = await this.prisma.workGig.findUnique({ where: { id: gigId } });
    if (!gig || gig.status !== 'OPEN')
      throw new NotFoundException('Gig not found or no longer open');
    if (gig.clientId === freelancerId)
      throw new BadRequestException("You can't propose on your own gig");
    if (!(Number(dto.proposedBudget) > 0))
      throw new BadRequestException('Enter a valid proposed budget');
    const existing = await this.prisma.workGigProposal.findUnique({
      where: { gigId_freelancerId: { gigId, freelancerId } },
    });
    if (existing)
      throw new BadRequestException(
        'You already submitted a proposal for this gig',
      );
    return this.prisma.workGigProposal.create({
      data: {
        gigId,
        freelancerId,
        message: dto.message || null,
        proposedBudget: Number(dto.proposedBudget),
      },
    });
  }

  async getGigProposals(clientId: string, gigId: string) {
    const gig = await this.prisma.workGig.findUnique({ where: { id: gigId } });
    if (!gig) throw new NotFoundException('Gig not found');
    if (gig.clientId !== clientId) throw new ForbiddenException();
    return this.prisma.workGigProposal.findMany({
      where: { gigId },
      include: {
        freelancer: { select: { id: true, username: true, profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Accepting a proposal funds escrow immediately: the client's wallet is
  // debited for the proposed budget right now (same "debit at commit time"
  // pattern as Live's prediction bets), held against the gig until the
  // client approves the freelancer's submitted work.
  async acceptProposal(clientId: string, proposalId: string) {
    const proposal = await this.prisma.workGigProposal.findUnique({
      where: { id: proposalId },
      include: { gig: true },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (proposal.gig.clientId !== clientId) throw new ForbiddenException();
    if (proposal.gig.status !== 'OPEN')
      throw new BadRequestException('This gig is no longer open');
    if (proposal.status !== 'PENDING')
      throw new BadRequestException('This proposal is no longer pending');

    const amount = proposal.proposedBudget;
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: clientId },
    });
    if (!wallet) throw new BadRequestException('No wallet found');
    if (wallet.balanceMasheleni < amount)
      throw new BadRequestException(
        'Insufficient MSH balance to fund this gig',
      );

    const [gig] = await this.prisma.$transaction([
      this.prisma.workGig.update({
        where: { id: proposal.gigId },
        data: {
          status: 'IN_PROGRESS',
          freelancerId: proposal.freelancerId,
          escrowAmount: amount,
        },
      }),
      this.prisma.wallet.update({
        where: { userId: clientId },
        data: { balanceMasheleni: { decrement: amount } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          amount: -amount,
          type: 'PAYMENT',
          status: 'SUCCESS',
        },
      }),
      this.prisma.workGigProposal.update({
        where: { id: proposalId },
        data: { status: 'ACCEPTED' },
      }),
      this.prisma.workGigProposal.updateMany({
        where: { gigId: proposal.gigId, id: { not: proposalId } },
        data: { status: 'REJECTED' },
      }),
    ]);
    return gig;
  }

  async submitGigWork(freelancerId: string, gigId: string) {
    const gig = await this.prisma.workGig.findUnique({ where: { id: gigId } });
    if (!gig) throw new NotFoundException('Gig not found');
    if (gig.freelancerId !== freelancerId) throw new ForbiddenException();
    if (gig.status !== 'IN_PROGRESS')
      throw new BadRequestException('This gig is not in progress');
    return this.prisma.workGig.update({
      where: { id: gigId },
      data: { status: 'SUBMITTED' },
    });
  }

  async approveGigCompletion(clientId: string, gigId: string) {
    const gig = await this.prisma.workGig.findUnique({ where: { id: gigId } });
    if (!gig) throw new NotFoundException('Gig not found');
    if (gig.clientId !== clientId) throw new ForbiddenException();
    if (gig.status !== 'SUBMITTED')
      throw new BadRequestException(
        'This gig has no submitted work to approve',
      );
    if (!gig.freelancerId)
      throw new BadRequestException('This gig has no assigned freelancer');

    const freelancerWallet = await this.prisma.wallet.findUnique({
      where: { userId: gig.freelancerId },
    });
    if (!freelancerWallet)
      throw new BadRequestException('Freelancer wallet not found');

    const [updated] = await this.prisma.$transaction([
      this.prisma.workGig.update({
        where: { id: gigId },
        data: { status: 'COMPLETED' },
      }),
      this.prisma.wallet.update({
        where: { userId: gig.freelancerId },
        data: { balanceMasheleni: { increment: gig.escrowAmount } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: freelancerWallet.id,
          amount: gig.escrowAmount,
          type: 'RECEIVE',
          status: 'SUCCESS',
        },
      }),
    ]);
    return updated;
  }

  async cancelGig(clientId: string, gigId: string) {
    const gig = await this.prisma.workGig.findUnique({ where: { id: gigId } });
    if (!gig) throw new NotFoundException('Gig not found');
    if (gig.clientId !== clientId) throw new ForbiddenException();
    if (gig.status !== 'OPEN')
      throw new BadRequestException(
        'Only an unfunded, open gig can be cancelled',
      );
    return this.prisma.workGig.update({
      where: { id: gigId },
      data: { status: 'CANCELLED' },
    });
  }
}
