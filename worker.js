// Cloudflare Worker - 数据库健康检查
// TODO: 替换为你自己的 Supabase 配置
const MYSITE_URL = "https://your-project-id.supabase.co";
const MYSITE_KEY = "your-supabase-anon-key";

// 健康检查函数
async function healthCheck() {
  try {
    const response = await fetch(`${MYSITE_URL}/rest/v1/config?select=count`, {
      headers: {
        'apikey': MYSITE_KEY,
        'Authorization': `Bearer ${MYSITE_KEY}`
      }
    });
    return {
      success: response.ok,
      status: response.status,
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    return {
      success: false,
      error: e.message,
      timestamp: new Date().toISOString()
    };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // favicon.ico 请求由静态资源处理，无需特殊重定向

    // 手动健康检查接口
    if (url.pathname === '/api/health-check') {
      const result = await healthCheck();
      return new Response(JSON.stringify(result, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return env.ASSETS.fetch(request);
  },

  // 定时触发器 - 每天自动执行健康检查
  async scheduled(event, env, ctx) {
    ctx.waitUntil(healthCheck());
  }
};
