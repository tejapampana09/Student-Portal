const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { load, NextResponse, request, errorResponse } = require('./helpers.cjs');
const env = { ...process.env };
afterEach(() => { process.env = { ...env }; });
const owner = 'AP24110010724';
const other = 'AP24110010000';
const deny = () => { throw new Error('Unexpected privileged operation'); };
const server = { 'next/server': { NextResponse } };

function route(file, { user = null, auth, rate, handle, post, db } = {}) {
  return load(file, {
    ...server,
    '@/server/utils/functions': {
      requireAuthResponse: auth || (async () => ({ payload: { username: owner } })),
      errorResponse, decryptData: x => x,
      enforceRateLimit: rate || (async () => ({ allowed: true })),
    },
    '@/lib/database/useMongo': { useMongo: db || (async () => ({ db: () => ({ collection: () => ({ findOne: async () => user }) }) })) },
    '@/server/auth/handleUserSession': { handleUserSession: handle || deny },
    '@/server/utils/httpAgents': {},
    axios: { create: () => ({ post: post || deny }) },
  });
}
const multi = 'src/app/api/srmapi/initiate/multi-session/route.ts';
const attendance = 'src/app/api/srmapi/attendance/mark/route.ts';

for (const file of [multi, attendance]) {
  test(`${file}: unauthenticated requests stop before body/DB`, async () => {
    const { POST } = route(file, { auth: async () => errorResponse('Unauthorized', {}, 401), db: deny });
    assert.equal((await POST({ json: deny })).status, 401);
  });
  test(`${file}: malformed JSON is rejected`, async () => {
    const { POST } = route(file, { db: deny });
    assert.equal((await POST({ json: async () => { throw new Error('JSON'); } })).status, 400);
  });
  test(`${file}: null body is rejected`, async () => {
    assert.equal((await route(file, { db: deny }).POST(request(null))).status, 400);
  });
  test(`${file}: other account rejected before credential lookup`, async () => {
    const body = file === multi ? { usernames: [owner, other] } : { username: other, code: 'A123456' };
    assert.equal((await route(file, { db: deny }).POST(request(body))).status, 403);
  });
  test(`${file}: rate limiting stops privileged work`, async () => {
    const { POST } = route(file, { db: deny, rate: async () => ({ allowed: false, retryAfterSeconds: 30 }) });
    const res = await POST(request({ code: 'A123456' }));
    assert.equal(res.status, 429);
    assert.equal(res.headers.get('Retry-After'), '30');
  });
}

test('multi-session normalizes own account and returns only its session', async () => {
  let called = 0;
  const { POST } = route(multi, { user: { portal_password: 'stored-password' }, handle: async args => {
    called++;
    assert.deepEqual(args, { username: owner, password: 'stored-password', allowCachedSession: true });
    return { success: true, sessionId: 'own-session' };
  } });
  const res = await POST(request({ usernames: [` ${owner.toLowerCase()} `, owner] }));
  assert.equal(res.status, 200);
  assert.equal(called, 1);
  assert.equal((await res.json()).results[0].sessionId, 'own-session');
});

test('multi-session rejects non-string usernames and oversized batches', async () => {
  for (const usernames of [[{}], Array(11).fill(owner), 'name']) {
    assert.equal((await route(multi, { db: deny }).POST(request({ usernames }))).status, 400);
  }
});

test('attendance ignores forged client session and uses authenticated account DB session', async () => {
  const { POST } = route(attendance, { user: { session_id: 'own-session' }, post: async (_url, _body, config) => {
    assert.equal(config.headers.Cookie, 'JSESSIONID=own-session');
    return { data: '{"resultstatus":"1"}' };
  } });
  const res = await POST(request({ username: owner, code: 'A123456', sessionid: 'victim-session' }));
  assert.equal((await res.json()).success, true);
});

test('attendance never submits a caller session when no owned session exists', async () => {
  assert.equal((await route(attendance).POST(request({ code: 'A123456', sessionid: 'victim-session' }))).status, 400);
});

test('attendance validates codes before DB or upstream work', async () => {
  for (const code of [{}, '', '123456', 'A123456\r\nextra']) {
    assert.equal((await route(attendance, { db: deny }).POST(request({ code }))).status, 400);
  }
});

test('expired attendance session forces renewal once and retries with the new session', async () => {
  let calls = 0;
  const { POST } = route(attendance, {
    user: { session_id: 'expired', portal_password: 'password' },
    handle: async args => { assert.equal(args.forceRefresh, true); return { success: true, sessionId: 'new', sessionTime: 'now' }; },
    post: async (_url, _body, config) => {
      calls++;
      assert.equal(config.headers.Cookie, `JSESSIONID=${calls === 1 ? 'expired' : 'new'}`);
      return { data: calls === 1 ? 'Session Expired' : '{"resultstatus":"1"}' };
    },
  });
  const body = await (await POST(request({ code: 'A123456' }))).json();
  assert.equal(calls, 2);
  assert.equal(body.renewedSession.sessionId, 'new');
});

test('code endpoint never reads or executes request code', async () => {
  const { POST } = load('src/app/api/code/run/route.ts', server);
  const res = await POST({ json: deny });
  assert.equal(res.status, 503);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});

test('local runner is disabled for every language', () => {
  const { executeCodeLocally } = load('src/server/code/codeExecutionService.ts');
  for (const language of ['python', 'javascript', 'unknown']) assert.throws(() => executeCodeLocally(language, 'arbitrary code', 'id'), /disabled/);
});

function verify(payload, db) {
  return load('src/server/auth/verifyUser.ts', {
    ...server, '@/server/utils/functions': { verifyToken: () => payload },
    '@/lib/database/useMongo': { useMongo: db || deny },
  }).validUser;
}

test('JWT verification fails closed without a session store', async () => {
  delete process.env.MONGO_URI;
  const result = await verify({ username: owner, sessionId: 's' })(request({}));
  assert.equal(result.valid, false);
  assert.equal(result.unavailable, true);
});

test('JWT verification fails closed on database error', async () => {
  process.env.MONGO_URI = 'test';
  const result = await verify({ username: owner, sessionId: 's' }, async () => { throw new Error('offline'); })(request({}));
  assert.equal(result.valid, false);
  assert.equal(result.unavailable, true);
});

for (const exists of [true, false]) {
  test(`JWT requires matching active, unexpired persisted session: ${exists}`, async () => {
    process.env.MONGO_URI = 'test';
    const validUser = verify({ username: owner, sessionId: 's' }, async () => ({ db: () => ({ collection: () => ({ findOne: async query => {
      assert.equal(query.username, owner);
      assert.equal(query.sessionId, 's');
      assert.equal(query.revokedAt, null);
      assert.equal(query.tokenHash.length, 64);
      assert.ok(query.expiresAt.$gt instanceof Date);
      return exists ? {} : null;
    } }) }) }));
    assert.equal((await validUser(request({}))).valid, exists);
  });
}

test('JWT rejects malformed identity claims', async () => {
  for (const payload of [null, { username: {}, sessionId: 's' }, { username: owner, sessionId: 10 }]) {
    assert.equal((await verify(payload)(request({}))).valid, false);
  }
});

function functions(db, validUser) {
  return load('src/server/utils/functions.ts', {
    ...server,
    axios: {}, jsonwebtoken: { sign: (_payload, _secret, opts) => { assert.equal(opts.expiresIn, '7d'); return 'signed-token'; } },
    '@/lib/database/useMongo': { useMongo: db || deny },
    '@/server/auth/verifyUser': { validUser: validUser || deny },
    '@/server/utils/headers': {}, '@/server/utils/httpAgents': {},
    '@/server/utils/responses': { userBlockedResponse: () => errorResponse('blocked', {}, 403) },
  });
}

test('session issuance fails without DB configuration', async () => {
  delete process.env.MONGO_URI;
  process.env.ACCESS_SECRET = 'a'.repeat(32);
  await assert.rejects(functions().createAuthSession(owner, false), /unavailable/);
});

test('session issuance fails when persistence fails or is unacknowledged', async () => {
  process.env.MONGO_URI = 'test'; process.env.ACCESS_SECRET = 'a'.repeat(32);
  for (const insertOne of [async () => { throw new Error('offline'); }, async () => ({ acknowledged: false })]) {
    const f = functions(async () => ({ db: () => ({ collection: () => ({ insertOne }) }) }));
    await assert.rejects(f.createAuthSession(owner, false));
  }
});

test('session issuance persists token hash and expiry before returning', async () => {
  process.env.MONGO_URI = 'test'; process.env.ACCESS_SECRET = 'a'.repeat(32);
  let saved;
  const f = functions(async () => ({ db: () => ({ collection: () => ({ insertOne: async doc => { saved = doc; return { acknowledged: true }; } }) }) }));
  const result = await f.createAuthSession(owner, false);
  assert.equal(saved.sessionId, result.sessionId);
  assert.equal(saved.username, owner);
  assert.ok(saved.expiresAt > saved.createdAt);
  assert.equal(saved.tokenHash.length, 64);
});

test('auth guards return 503 rather than accepting DB failure or logging users out', async () => {
  const f = functions(deny, async () => ({ valid: false, unavailable: true }));
  for (const guard of [f.requireAuthResponse, f.requireAuthResponseAdmin]) {
    const res = await guard(request({}));
    assert.equal(res.status, 503);
    assert.equal((await res.json()).action, undefined);
  }
});

test('logout and account revocation propagate persistence failures', async () => {
  process.env.MONGO_URI = 'test';
  const f = functions(async () => { throw new Error('offline'); });
  await assert.rejects(f.revokeAuthSession('token'), /offline/);
  await assert.rejects(f.revokeAllAuthSessions(owner), /offline/);
});

test('rate limiter refuses traffic when its store is missing or unavailable', async () => {
  const f = functions(async () => { throw new Error('offline'); });
  delete process.env.MONGO_URI;
  assert.equal((await f.enforceRateLimit('key', 10, 1000)).allowed, false);
  process.env.MONGO_URI = 'test';
  assert.equal((await f.enforceRateLimit('key', 10, 1000)).allowed, false);
});

function sessionHandler(login) {
  return load('src/server/auth/handleUserSession.ts', {
    '@/lib/database/useMongo': { useMongo: async () => ({ db: () => ({ collection: () => ({
      findOne: async () => ({ session_id: 'cached-session', session_time: new Date().toISOString() }),
      updateOne: async () => {},
    }) }) }) },
    '@/server/auth/login': { login }, '@/shared/utils/functions': { getTime: () => 'now' },
    '@/server/utils/functions': { decryptData: x => x, decryptLegacyData: x => x, encryptData: x => x },
    luxon: { DateTime: { fromFormat: () => ({ isValid: false }), now: () => ({ toJSDate: () => new Date() }) } },
  }).handleUserSession;
}

test('fresh cached session cannot authenticate a wrong password', async () => {
  process.env.MONGO_URI = 'test';
  let called = false;
  const result = await sessionHandler(async (_u, password) => {
    called = true; assert.equal(password, 'wrong'); return { success: false, message: 'Invalid credentials' };
  })({ username: owner, password: 'wrong' });
  assert.equal(called, true);
  assert.equal(result.success, false);
});

test('portal outage cannot turn cached data into login authentication', async () => {
  process.env.MONGO_URI = 'test';
  const result = await sessionHandler(async () => ({ success: false, message: 'SRM server is unreachable' }))({ username: owner, password: 'wrong' });
  assert.equal(result.success, false);
  assert.equal(result.hasCachedData, undefined);
  assert.equal(result.cachedSessionId, undefined);
});

test('already authenticated session renewal can reuse its own fresh cache', async () => {
  process.env.MONGO_URI = 'test';
  const result = await sessionHandler(deny)({ username: owner, password: 'stored', allowCachedSession: true });
  assert.equal(result.sessionId, 'cached-session');
});

test('force refresh bypasses even a fresh authenticated cache', async () => {
  process.env.MONGO_URI = 'test';
  const result = await sessionHandler(async () => ({ success: true, sessionId: 'fresh-session' }))({ username: owner, password: 'stored', allowCachedSession: true, forceRefresh: true });
  assert.equal(result.sessionId, 'fresh-session');
});

test('blocked-account lookup failure returns 503 without a logout action', async () => {
  process.env.MONGO_URI = 'test';
  const f = functions(async () => { throw new Error('offline'); }, async () => ({ valid: true, payload: { username: owner } }));
  for (const guard of [f.requireAuthResponse, f.requireAuthResponseAdmin]) {
    const res = await guard(request({}));
    assert.equal(res.status, 503);
    assert.equal((await res.json()).action, undefined);
  }
});

test('rate limiting applies shared counter results at the limit boundary', async () => {
  process.env.MONGO_URI = 'test';
  for (const count of [10, 11]) {
    const f = functions(async () => ({ db: () => ({ collection: () => ({ findOneAndUpdate: async () => ({ count, expiresAt: new Date(Date.now() + 30_000) }) }) }) }));
    const result = await f.enforceRateLimit('test', 10, 60_000);
    assert.equal(result.allowed, count <= 10);
    if (!result.allowed) assert.ok(result.retryAfterSeconds > 0);
  }
});

test('login never issues tokens from a failed cached-data response', async () => {
  const { POST } = load('src/app/api/auth/login/route.ts', {
    ...server,
    '@/validators/auth/login': { isValidRegNumber: () => [true] },
    '@/server/auth/handleUserSession': { handleUserSession: async () => ({ success: false, hasCachedData: true, message: 'offline' }) },
    '@/server/utils/responses': { paramatersNotMatched: () => errorResponse('parameters'), userBlockedResponse: deny },
    '@/server/utils/functions': {
      errorResponse, createAuthSession: deny, isAdmin: () => false, isBlocked: async () => false,
      enforceRateLimit: async () => ({ allowed: true }),
    },
  });
  const res = await POST(request({ username: owner, password: 'wrong', wantCachedData: true }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).accessToken, undefined);
});

test('renewal never sends a malformed decrypted session upstream', async () => {
  const { POST } = route(attendance, { user: { session_id: { unsafe: 'value' } } });
  assert.equal((await POST(request({ code: 'A123456' }))).status, 503);
});
