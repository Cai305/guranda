import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class LearningService {
  constructor(private prisma: PrismaService) {}

  // ── Courses ───────────────────────────────────────────────────────────────

  async createCourse(userId: string, dto: any) {
    if (!dto.title?.trim() || !dto.category?.trim())
      throw new BadRequestException('Title and category are required');
    return this.prisma.learningCourse.create({
      data: {
        creatorId: userId,
        title: dto.title.trim(),
        description: dto.description || null,
        category: dto.category.trim(),
        level: dto.level || 'Beginner',
        price: dto.price || 0,
        thumbnailUrl: dto.thumbnailUrl || null,
      },
    });
  }

  async addLesson(userId: string, courseId: string, dto: any) {
    const course = await this.prisma.learningCourse.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (course.creatorId !== userId) throw new ForbiddenException();
    if (!dto.title?.trim())
      throw new BadRequestException('Lesson title is required');
    const count = await this.prisma.learningLesson.count({
      where: { courseId },
    });
    return this.prisma.learningLesson.create({
      data: {
        courseId,
        title: dto.title.trim(),
        content: dto.content || null,
        videoUrl: dto.videoUrl || null,
        order: count,
        durationMin: dto.durationMin || 10,
      },
    });
  }

  async listCourses(category?: string, search?: string) {
    return this.prisma.learningCourse.findMany({
      where: {
        status: 'PUBLISHED',
        ...(category ? { category } : {}),
        ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: {
        creator: { select: { id: true, username: true, profile: true } },
        _count: { select: { lessons: true, enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async myCreatedCourses(userId: string) {
    return this.prisma.learningCourse.findMany({
      where: { creatorId: userId },
      include: { _count: { select: { lessons: true, enrollments: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCourse(id: string, userId: string) {
    const course = await this.prisma.learningCourse.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, username: true, profile: true } },
        lessons: { orderBy: { order: 'asc' } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    const enrollment = await this.prisma.learningEnrollment.findUnique({
      where: { courseId_studentId: { courseId: id, studentId: userId } },
      include: { lessonProgress: true, certificate: true },
    });
    return { ...course, enrollment: enrollment || null };
  }

  async enroll(userId: string, courseId: string) {
    const course = await this.prisma.learningCourse.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (course.creatorId === userId)
      throw new BadRequestException("You can't enroll in your own course");
    const existing = await this.prisma.learningEnrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId: userId } },
    });
    if (existing) throw new BadRequestException('You are already enrolled');

    if (course.price > 0) {
      const studentWallet = await this.prisma.wallet.findUnique({
        where: { userId },
      });
      if (!studentWallet) throw new BadRequestException('No wallet found');
      if (studentWallet.balanceMasheleni < course.price)
        throw new BadRequestException('Insufficient MSH balance');
      const creatorWallet = await this.prisma.wallet.findUnique({
        where: { userId: course.creatorId },
      });
      if (!creatorWallet)
        throw new BadRequestException('Course creator wallet not found');

      const [enrollment] = await this.prisma.$transaction([
        this.prisma.learningEnrollment.create({
          data: { courseId, studentId: userId },
        }),
        this.prisma.wallet.update({
          where: { userId },
          data: { balanceMasheleni: { decrement: course.price } },
        }),
        this.prisma.transaction.create({
          data: {
            walletId: studentWallet.id,
            amount: -course.price,
            type: 'PAYMENT',
            status: 'SUCCESS',
          },
        }),
        this.prisma.wallet.update({
          where: { userId: course.creatorId },
          data: { balanceMasheleni: { increment: course.price } },
        }),
        this.prisma.transaction.create({
          data: {
            walletId: creatorWallet.id,
            amount: course.price,
            type: 'RECEIVE',
            status: 'SUCCESS',
          },
        }),
      ]);
      return enrollment;
    }

    return this.prisma.learningEnrollment.create({
      data: { courseId, studentId: userId },
    });
  }

  async myEnrollments(userId: string) {
    return this.prisma.learningEnrollment.findMany({
      where: { studentId: userId },
      include: {
        course: { include: { _count: { select: { lessons: true } } } },
        certificate: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async completeLesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.learningLesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const enrollment = await this.prisma.learningEnrollment.findUnique({
      where: {
        courseId_studentId: { courseId: lesson.courseId, studentId: userId },
      },
    });
    if (!enrollment)
      throw new ForbiddenException('You are not enrolled in this course');

    await this.prisma.learningLessonProgress.upsert({
      where: {
        enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId },
      },
      create: {
        enrollmentId: enrollment.id,
        lessonId,
        completed: true,
        completedAt: new Date(),
      },
      update: { completed: true, completedAt: new Date() },
    });

    const totalLessons = await this.prisma.learningLesson.count({
      where: { courseId: lesson.courseId },
    });
    const completedCount = await this.prisma.learningLessonProgress.count({
      where: { enrollmentId: enrollment.id, completed: true },
    });
    const progressPct =
      totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    const updated = await this.prisma.learningEnrollment.update({
      where: { id: enrollment.id },
      data: {
        progressPct,
        status: progressPct >= 100 ? 'COMPLETED' : 'ACTIVE',
        completedAt: progressPct >= 100 ? new Date() : null,
      },
      include: { certificate: true },
    });

    if (progressPct >= 100 && !updated.certificate) {
      const certificate = await this.prisma.learningCertificate.create({
        data: {
          enrollmentId: enrollment.id,
          certificateCode: crypto.randomBytes(8).toString('hex').toUpperCase(),
        },
      });
      return { ...updated, certificate };
    }

    return updated;
  }

  async myCertificates(userId: string) {
    return this.prisma.learningCertificate.findMany({
      where: { enrollment: { studentId: userId } },
      include: { enrollment: { include: { course: true } } },
      orderBy: { issuedAt: 'desc' },
    });
  }

  // ── Tutors ────────────────────────────────────────────────────────────────

  async registerTutor(userId: string, dto: any) {
    const existing = await this.prisma.learningTutor.findUnique({
      where: { ownerId: userId },
    });
    if (existing)
      throw new BadRequestException('You are already registered as a tutor');
    if (!dto.name?.trim() || !dto.subjects?.trim() || !dto.hourlyRate) {
      throw new BadRequestException(
        'Name, subjects and hourly rate are required',
      );
    }
    return this.prisma.learningTutor.create({
      data: {
        ownerId: userId,
        name: dto.name.trim(),
        bio: dto.bio || null,
        subjects: dto.subjects.trim(),
        hourlyRate: dto.hourlyRate,
        avatarUrl: dto.avatarUrl || null,
      },
    });
  }

  async updateTutor(userId: string, dto: any) {
    const tutor = await this.prisma.learningTutor.findUnique({
      where: { ownerId: userId },
    });
    if (!tutor)
      throw new NotFoundException('You have not registered as a tutor yet');
    return this.prisma.learningTutor.update({
      where: { ownerId: userId },
      data: {
        name: dto.name?.trim() ?? tutor.name,
        bio: dto.bio ?? tutor.bio,
        subjects: dto.subjects?.trim() ?? tutor.subjects,
        hourlyRate: dto.hourlyRate ?? tutor.hourlyRate,
        avatarUrl: dto.avatarUrl ?? tutor.avatarUrl,
      },
    });
  }

  async getMyTutorProfile(userId: string) {
    return this.prisma.learningTutor.findUnique({ where: { ownerId: userId } });
  }

  async listTutors(subject?: string) {
    return this.prisma.learningTutor.findMany({
      where: subject
        ? { subjects: { contains: subject, mode: 'insensitive' } }
        : {},
      include: {
        owner: { select: { id: true, username: true, profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTutor(id: string) {
    const tutor = await this.prisma.learningTutor.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, username: true, profile: true } },
      },
    });
    if (!tutor) throw new NotFoundException('Tutor not found');
    return tutor;
  }

  async bookSession(
    studentId: string,
    tutorId: string,
    dto: { scheduledAt: string; topic?: string },
  ) {
    const tutor = await this.prisma.learningTutor.findUnique({
      where: { id: tutorId },
    });
    if (!tutor) throw new NotFoundException('Tutor not found');
    if (tutor.ownerId === studentId)
      throw new BadRequestException("You can't book your own tutoring");
    if (!dto.scheduledAt) throw new BadRequestException('Pick a date and time');
    const scheduledAt = new Date(dto.scheduledAt);
    if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      throw new BadRequestException('Pick a future date and time');
    }

    const clash = await this.prisma.learningTutorSession.findFirst({
      where: { tutorId, status: 'CONFIRMED', scheduledAt },
    });
    if (clash)
      throw new BadRequestException('That time slot is already booked');

    const fee = tutor.hourlyRate;
    const studentWallet = await this.prisma.wallet.findUnique({
      where: { userId: studentId },
    });
    if (!studentWallet) throw new BadRequestException('No wallet found');
    if (studentWallet.balanceMasheleni < fee)
      throw new BadRequestException('Insufficient MSH balance');
    const tutorWallet = await this.prisma.wallet.findUnique({
      where: { userId: tutor.ownerId },
    });
    if (!tutorWallet) throw new BadRequestException('Tutor wallet not found');

    const [session] = await this.prisma.$transaction([
      this.prisma.learningTutorSession.create({
        data: {
          tutorId,
          studentId,
          scheduledAt,
          topic: dto.topic || null,
          fee,
        },
        include: { tutor: true },
      }),
      this.prisma.wallet.update({
        where: { userId: studentId },
        data: { balanceMasheleni: { decrement: fee } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: studentWallet.id,
          amount: -fee,
          type: 'PAYMENT',
          status: 'SUCCESS',
        },
      }),
      this.prisma.wallet.update({
        where: { userId: tutor.ownerId },
        data: { balanceMasheleni: { increment: fee } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: tutorWallet.id,
          amount: fee,
          type: 'RECEIVE',
          status: 'SUCCESS',
        },
      }),
    ]);
    return session;
  }

  async myTutorSessions(userId: string) {
    const tutor = await this.prisma.learningTutor.findUnique({
      where: { ownerId: userId },
    });
    if (!tutor)
      throw new NotFoundException('You have not registered as a tutor yet');
    return this.prisma.learningTutorSession.findMany({
      where: { tutorId: tutor.id },
      include: {
        student: { select: { id: true, username: true, profile: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async myBookedSessions(userId: string) {
    return this.prisma.learningTutorSession.findMany({
      where: { studentId: userId },
      include: { tutor: true },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async updateSessionStatus(userId: string, sessionId: string, status: string) {
    const session = await this.prisma.learningTutorSession.findUnique({
      where: { id: sessionId },
      include: { tutor: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.tutor.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.learningTutorSession.update({
      where: { id: sessionId },
      data: { status },
    });
  }

  // ── Study communities ─────────────────────────────────────────────────────

  async createCommunity(userId: string, dto: any) {
    if (!dto.name?.trim() || !dto.topic?.trim())
      throw new BadRequestException('Name and topic are required');
    const community = await this.prisma.learningCommunity.create({
      data: {
        creatorId: userId,
        name: dto.name.trim(),
        description: dto.description || null,
        topic: dto.topic.trim(),
      },
    });
    await this.prisma.learningCommunityMember.create({
      data: { communityId: community.id, userId },
    });
    return community;
  }

  async listCommunities(topic?: string) {
    return this.prisma.learningCommunity.findMany({
      where: topic ? { topic } : {},
      include: {
        creator: { select: { id: true, username: true, profile: true } },
        _count: { select: { members: true, posts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async myCommunities(userId: string) {
    const memberships = await this.prisma.learningCommunityMember.findMany({
      where: { userId },
      include: {
        community: {
          include: { _count: { select: { members: true, posts: true } } },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => m.community);
  }

  async joinCommunity(userId: string, communityId: string) {
    const community = await this.prisma.learningCommunity.findUnique({
      where: { id: communityId },
    });
    if (!community) throw new NotFoundException('Community not found');
    const existing = await this.prisma.learningCommunityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (existing) throw new BadRequestException('You are already a member');
    return this.prisma.learningCommunityMember.create({
      data: { communityId, userId },
    });
  }

  async getCommunity(id: string, userId: string) {
    const community = await this.prisma.learningCommunity.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, username: true, profile: true } },
        _count: { select: { members: true } },
        posts: {
          include: {
            author: { select: { id: true, username: true, profile: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!community) throw new NotFoundException('Community not found');
    const membership = await this.prisma.learningCommunityMember.findUnique({
      where: { communityId_userId: { communityId: id, userId } },
    });
    return { ...community, isMember: !!membership };
  }

  async createPost(userId: string, communityId: string, content: string) {
    const membership = await this.prisma.learningCommunityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (!membership)
      throw new ForbiddenException('Join this community to post');
    if (!content?.trim())
      throw new BadRequestException('Post content is required');
    return this.prisma.learningCommunityPost.create({
      data: { communityId, authorId: userId, content: content.trim() },
      include: {
        author: { select: { id: true, username: true, profile: true } },
      },
    });
  }
}
