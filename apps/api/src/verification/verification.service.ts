import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { VerificationStatus } from '@prisma/client';

@Injectable()
export class VerificationService {
  constructor(private prisma: PrismaService) {}

  // Called at registration — personal info is mandatory for every account,
  // but on its own it only gets you to UNVERIFIED (ID is still required).
  async createPersonalRecord(
    userId: string,
    data: {
      firstName: string;
      lastName: string;
      occupation: string;
      dateOfBirth?: string;
    },
  ) {
    return this.prisma.verification.create({
      data: {
        userId,
        firstName: data.firstName,
        lastName: data.lastName,
        occupation: data.occupation,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
    });
  }

  async me(userId: string) {
    const v = await this.prisma.verification.findUnique({
      where: { userId },
      include: { businesses: true, certificates: true },
    });
    if (!v)
      throw new NotFoundException(
        'No verification record — this account predates registration requirements',
      );
    return v;
  }

  async assertVerified(userId: string, reason = 'This action') {
    const v = await this.prisma.verification.findUnique({ where: { userId } });
    if (!v || v.status !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException(
        `${reason} requires a verified account — verify your identity first`,
      );
    }
  }

  // Submits (or re-submits) the ID + optional business/certificate documents.
  // Simple individual submissions (no business, no certificates) are
  // auto-approved. Anything claiming a business or certificates goes to
  // PENDING for manual admin review, since those need document checks —
  // but an admin can also approve/reject any submission by hand regardless.
  async submit(
    userId: string,
    dto: {
      idType: string;
      idNumber: string;
      idDocumentUrl: string;
      business?: {
        name: string;
        registrationNumber?: string;
        documents: string[];
      };
      certificates?: { title: string; issuer?: string; fileUrl: string }[];
    },
  ) {
    if (!dto.idType || !dto.idNumber || !dto.idDocumentUrl) {
      throw new BadRequestException(
        'ID type, number and document are all required',
      );
    }
    if (
      dto.business &&
      (!dto.business.name || !dto.business.documents?.length)
    ) {
      throw new BadRequestException(
        'Business name and at least one supporting document are required',
      );
    }
    if (dto.certificates?.some((c) => !c.title || !c.fileUrl)) {
      throw new BadRequestException(
        'Each certificate needs a title and an uploaded file',
      );
    }

    const existing = await this.prisma.verification.findUnique({
      where: { userId },
    });
    if (!existing) {
      throw new BadRequestException(
        'Complete registration with your personal info before submitting verification',
      );
    }

    const needsManualReview =
      Boolean(dto.business) || Boolean(dto.certificates?.length);
    const status = needsManualReview
      ? VerificationStatus.PENDING
      : VerificationStatus.VERIFIED;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.verification.update({
        where: { userId },
        data: {
          idType: dto.idType,
          idNumber: dto.idNumber,
          idDocumentUrl: dto.idDocumentUrl,
          hasBusiness: Boolean(dto.business),
          isGraduate: Boolean(dto.certificates?.length),
          status,
          submittedAt: new Date(),
          reviewedAt: needsManualReview ? null : new Date(),
          reviewedBy: needsManualReview ? null : 'auto',
          rejectionReason: null,
        },
      });

      if (dto.business) {
        await tx.business.create({
          data: {
            verificationId: updated.id,
            name: dto.business.name,
            registrationNumber: dto.business.registrationNumber,
            documents: dto.business.documents,
          },
        });
      }

      for (const cert of dto.certificates ?? []) {
        await tx.certificate.create({
          data: {
            verificationId: updated.id,
            title: cert.title,
            issuer: cert.issuer,
            fileUrl: cert.fileUrl,
          },
        });
      }

      return tx.verification.findUnique({
        where: { userId },
        include: { businesses: true, certificates: true },
      });
    });
  }

  // ---- Admin ----

  async listQueue(status?: string) {
    return this.prisma.verification.findMany({
      where: status
        ? { status: status as VerificationStatus }
        : { status: VerificationStatus.PENDING },
      include: {
        user: { select: { id: true, username: true, profile: true } },
        businesses: true,
        certificates: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async approve(id: string, adminId = 'admin') {
    return this.prisma.verification.update({
      where: { id },
      data: {
        status: VerificationStatus.VERIFIED,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectionReason: null,
      },
    });
  }

  async reject(id: string, reason: string, adminId = 'admin') {
    return this.prisma.verification.update({
      where: { id },
      data: {
        status: VerificationStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectionReason: reason || 'Not specified',
      },
    });
  }
}
