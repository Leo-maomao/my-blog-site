// Cloudflare Worker - 数据库健康检查
// MySite数据库（Nav + Blog共用）
const MYSITE_URL = "https://jqsmoygkbqukgnwzkxvq.supabase.co";
const MYSITE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxc21veWdrYnF1a2dud3preHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3Mjk0MzYsImV4cCI6MjA4MDMwNTQzNn0.RrGVhh2TauEmGE4Elc2f3obUmZKHVdYVVMaz2kxKlW4";

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

    // 处理favicon.ico请求 - 使用301永久重定向（SEO友好）
    if (url.pathname === '/favicon.ico') {
      return Response.redirect('https://jqsmoygkbqukgnwzkxvq.supabase.co/storage/v1/object/public/assets/Favicon.png', 301);
    }

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
