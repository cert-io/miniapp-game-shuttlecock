export interface Env {
  // wrangler.jsonc의 assets.binding
  ASSETS: Fetcher;
}

const withSpaFallback = async (request: Request, env: Env): Promise<Response> => {
  const res = await env.ASSETS.fetch(request);

  // 정적 자산이 있으면 그대로 반환
  if (res.status !== 404) return res;

  // SPA 라우팅: 없는 경로는 index.html로 fallback
  const url = new URL(request.url);
  const indexUrl = new URL("/index.html", url);

  // method/headers는 유지하고 URL만 index로 변경
  const indexReq = new Request(indexUrl.toString(), request);
  return env.ASSETS.fetch(indexReq);
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return withSpaFallback(request, env);
  },
};

