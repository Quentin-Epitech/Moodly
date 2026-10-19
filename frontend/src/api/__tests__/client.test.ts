// Le client lit EXPO_PUBLIC_API_URL au chargement : on le recharge pour chaque test
type ClientModule = typeof import('@/api/client');

function loadClient(): ClientModule {
  process.env.EXPO_PUBLIC_API_URL = 'http://api.test';
  let client!: ClientModule;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- rechargement isolé du module
    client = require('@/api/client');
  });
  return client;
}

const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('client API', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retente une lecture une fois après une coupure réseau', async () => {
    const { request } = loadClient();
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed')).mockReturnValueOnce(json(200, { ok: 1 }));

    await expect(request('/tags')).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ne retente jamais une écriture (pas de double saisie)', async () => {
    const { request, ApiError } = loadClient();
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    const call = request('/moods', { method: 'POST', body: { score: 3 } });
    await expect(call).rejects.toBeInstanceOf(ApiError);
    await expect(call).rejects.toMatchObject({ status: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('abandonne une requête sans réponse au bout du délai', async () => {
    jest.useFakeTimers();
    const { request, TIMEOUT_MS } = loadClient();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    const assertion = expect(request('/moods', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 0 });
    await jest.advanceTimersByTimeAsync(TIMEOUT_MS);
    await assertion;
  });

  it("transmet le message d'erreur de l'API et signale une session expirée", async () => {
    const { request, setUnauthorizedHandler } = loadClient();
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);

    fetchMock.mockReturnValueOnce(json(409, { error: "Humeur déjà saisie aujourd'hui" }));
    await expect(request('/moods', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 409,
      message: "Humeur déjà saisie aujourd'hui",
    });

    fetchMock.mockReturnValueOnce(json(401, { error: 'Session expirée, reconnectez-vous' }));
    await expect(request('/me')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("n'appelle pas le gestionnaire de session pour un échec de connexion", async () => {
    const { request, setUnauthorizedHandler } = loadClient();
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetchMock.mockReturnValueOnce(json(401, { error: 'Email ou mot de passe incorrect' }));

    await expect(request('/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({
      status: 401,
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
