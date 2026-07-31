import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// Regression tests for the findings from the security-hardening pass — see
// docs/ARCHITECTURE_RECOMMENDATIONS.md. Each block guards one specific
// invariant that was previously broken; these should fail loudly if any of
// them regress.
describe('Security invariants (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  async function registerUser(username: string, password: string) {
    const res = await request(server).post('/users/register').send({
      username,
      passwordHash: password,
      firstName: 'Test',
      lastName: 'User',
      occupation: 'QA',
      isSelfCustodial: false,
    });
    return res.body as { token: string; user: { userId: string; displayName: string } };
  }

  async function login(username: string, password: string) {
    const res = await request(server)
      .post('/users/login')
      .send({ username, password });
    return res;
  }

  describe('passwordHash / encryptedSeed never leave the API', () => {
    it('register response never contains passwordHash', async () => {
      const uname = `sectest_${Date.now()}`;
      const res = await request(server).post('/users/register').send({
        username: uname,
        passwordHash: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User',
        occupation: 'QA',
        isSelfCustodial: false,
      });
      expect(res.status).toBe(201);
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
      expect(JSON.stringify(res.body)).not.toContain('encryptedSeed');
    });

    it('login response never contains passwordHash, and succeeds with the real password', async () => {
      const uname = `sectest_${Date.now()}_login`;
      await registerUser(uname, 'TestPass123!');
      const res = await login(uname, 'TestPass123!');
      expect(res.status).toBe(201);
      expect(res.body.token).toBeTruthy();
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('the posts feed (author.include chain) never contains passwordHash', async () => {
      const uname = `sectest_${Date.now()}_feed`;
      const { token } = await registerUser(uname, 'TestPass123!');
      const res = await request(server)
        .get('/posts')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });
  });

  describe('JwtAuthGuard actually gates protected routes', () => {
    it('rejects an unauthenticated request to wallets/me', async () => {
      const res = await request(server).get('/wallets/me');
      expect(res.status).toBe(401);
    });

    it('rejects an unauthenticated request to users/me', async () => {
      const res = await request(server).get('/users/me');
      expect(res.status).toBe(401);
    });

    it('never trusts a spoofed x-user-id header in place of a real token', async () => {
      const uname = `sectest_${Date.now()}_spoof`;
      const { user: victim } = await registerUser(uname, 'TestPass123!');
      // No Authorization header at all — only the legacy spoofable header.
      const res = await request(server)
        .get('/users/me')
        .set('x-user-id', victim.userId);
      expect(res.status).toBe(401);
    });
  });

  describe('Suspension takes effect immediately', () => {
    it('suspends a user, rejects their existing token and fresh logins, then restores on unsuspend', async () => {
      const uname = `sectest_${Date.now()}_suspend`;
      const password = 'TestPass123!';
      const { token, user } = await registerUser(uname, password);
      const adminKey = process.env.ADMIN_API_KEY;

      // Sanity: token works before suspension.
      const before = await request(server)
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`);
      expect(before.status).toBe(200);

      await request(server)
        .post(`/admin/users/${user.userId}/suspend`)
        .set('x-admin-key', adminKey!)
        .expect(201);

      const afterSuspendWithOldToken = await request(server)
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`);
      expect(afterSuspendWithOldToken.status).toBe(401);

      const freshLoginWhileSuspended = await login(uname, password);
      expect(freshLoginWhileSuspended.status).toBe(401);

      await request(server)
        .post(`/admin/users/${user.userId}/unsuspend`)
        .set('x-admin-key', adminKey!)
        .expect(201);

      const afterUnsuspend = await login(uname, password);
      expect(afterUnsuspend.status).toBe(201);
      expect(afterUnsuspend.body.token).toBeTruthy();
    });
  });

  describe('Admin surface access control', () => {
    it('rejects admin/deposits with no credentials at all', async () => {
      const res = await request(server).get('/admin/deposits');
      expect(res.status).toBe(401);
    });

    it('rejects admin/verifications with no credentials at all', async () => {
      const res = await request(server).get('/admin/verifications');
      expect(res.status).toBe(401);
    });

    it('accepts the shared ADMIN_API_KEY (website ops dashboard path)', async () => {
      const res = await request(server)
        .get('/admin/deposits')
        .set('x-admin-key', process.env.ADMIN_API_KEY!);
      expect(res.status).toBe(200);
    });

    it('rejects a valid JWT for a non-admin user', async () => {
      const uname = `sectest_${Date.now()}_nonadmin`;
      const { token } = await registerUser(uname, 'TestPass123!');
      const res = await request(server)
        .get('/admin/deposits')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });
  });

  describe('Login/register rate limiting', () => {
    it('throttles rapid repeated login attempts', async () => {
      const attempts = await Promise.all(
        Array.from({ length: 7 }, () =>
          request(server)
            .post('/users/login')
            .send({ username: 'rate-limit-probe', password: 'x' }),
        ),
      );
      const statuses = attempts.map((r) => r.status);
      expect(statuses).toContain(429);
    });
  });
});
