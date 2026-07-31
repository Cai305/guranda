import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MINI_APPS_CATALOG } from './mini-apps-catalog';

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) {}

  async getAllApps() {
    return this.prisma.storeApp.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async publishApp(data: any, userId: string) {
    return this.prisma.storeApp.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        iconUrl: data.iconUrl,
        color: data.color || '#3A86FF',
        sourceUrl: data.sourceUrl,
        isNative: false,
        developerId: userId,
      },
    });
  }

  /** Full catalog (built-in modules + published third-party apps) annotated with this user's install state. */
  async getCatalogForUser(userId: string) {
    const [thirdParty, installedRows] = await Promise.all([
      this.getAllApps(),
      this.prisma.installedApp.findMany({
        where: { userId },
        select: { appId: true },
      }),
    ]);
    const installedIds = new Set(installedRows.map((r) => r.appId));

    const modules = MINI_APPS_CATALOG.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.tagline,
      solves: m.solves,
      features: m.features,
      kind: 'module' as const,
      installed: installedIds.has(m.id),
    }));
    const apps = thirdParty.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      kind: 'app' as const,
      installed: installedIds.has(a.id),
    }));

    return [...modules, ...apps];
  }

  async getInstalledAppIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.installedApp.findMany({
      where: { userId },
      select: { appId: true },
    });
    return rows.map((r) => r.appId);
  }

  async installApp(userId: string, appId: string) {
    await this.prisma.installedApp.upsert({
      where: { userId_appId: { userId, appId } },
      update: {},
      create: { userId, appId },
    });
    return { installed: true, appId };
  }

  async uninstallApp(userId: string, appId: string) {
    await this.prisma.installedApp.deleteMany({ where: { userId, appId } });
    return { installed: false, appId };
  }
}
