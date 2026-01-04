# Blog 项目规范 (V2)

> 毛毛的产品日记 - 个人博客系统
> 
> **⚠️ 重要提醒：每次 git commit 后必须更新本文档底部的「提交记录」！**

---

## 一、规范依赖

本项目遵循 `../rules/CLAUDE.md` 及其索引的所有规范文档。

**阅读优先级**：
1. 本文档（项目特有配置）
2. `../rules/CLAUDE.md`（总纲入口）
3. 按任务类型阅读对应子文档

---

## 二、项目概述

### 2.1 项目定位

| 项目 | 说明 |
|------|------|
| **名称** | 毛毛的产品日记 |
| **类型** | 个人博客系统 |
| **用途** | 产品思考记录、知识沉淀、经验分享 |
| **线上地址** | Cloudflare Pages 部署 |

### 2.2 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | HTML5 + CSS3 + ES5/ES6 | 原生开发，无框架依赖 |
| **图标库** | Remix Icon 3.5.0 | CDN 引入 |
| **数据库** | Supabase (PostgreSQL) | 与 Nav 项目共用同一数据库 |
| **存储** | Supabase Storage | 图片存储（blog-covers bucket） |
| **部署** | Cloudflare Pages + Worker | 静态托管 + 边缘计算 |
| **统计** | 51.la | 页面访问和事件追踪 |

### 2.3 关联项目

| 项目 | 关系 | 数据表 |
|------|------|--------|
| **Nav (导航站)** | 共用数据库、统一设计语言 | `tools_data`, `feedback`, `config` |
| **Blog (本项目)** | 独立部署 | `blog_posts`, `blog_feedback`, `config` |

---

## 三、项目结构

```
blog/
├── CLAUDE.md              # 项目规范（本文档）
├── README.md              # 项目说明
├── worker.js              # Cloudflare Worker（健康检查、favicon重定向）
├── wrangler.toml          # Cloudflare 部署配置
└── public/                # 静态资源目录
    ├── index.html         # 首页（博客主页）
    ├── admin.html         # 管理后台
    ├── diary.html         # 产品日记分类页
    ├── experience.html    # 产品体验分类页
    ├── notes.html         # 随手记录分类页
    ├── post.html          # 文章详情页
    ├── preview.html       # 文章预览页
    ├── css/
    │   └── style.css      # 全局样式（与 Nav 统一设计语言）
    ├── js/
    │   ├── script.js      # 核心业务逻辑（DataService、UI组件）
    │   └── admin.js       # 管理后台逻辑
    ├── images/            # 静态图片资源
    ├── robots.txt         # 搜索引擎爬虫配置
    ├── sitemap.xml        # 站点地图
    ├── rss.xml            # RSS Feed
    ├── llms.txt           # AI/LLM 爬虫说明
    └── indexnow-key.txt   # IndexNow 验证文件
```

---

## 四、数据库设计

### 4.1 数据表结构

#### blog_posts（博客文章表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | BIGINT | 主键，自增 |
| `title` | TEXT | 文章标题 |
| `excerpt` | TEXT | 文章摘要 |
| `content` | TEXT | 文章内容（HTML） |
| `category` | TEXT | 分类：diary/experience/notes |
| `cover` | TEXT | 封面图 URL |
| `badge` | TEXT | 角标文字 |
| `badge_class` | TEXT | 角标样式类 |
| `likes` | INT | 点赞数 |
| `ai_summary` | TEXT | AI 生成的摘要 |
| `created_at` | TIMESTAMPTZ | 创建时间 |
| `updated_at` | TIMESTAMPTZ | 更新时间 |
| `published` | BOOLEAN | 是否发布 |

#### blog_feedback（博客反馈表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | BIGINT | 主键，自增 |
| `content` | TEXT | 反馈内容 |
| `contact` | TEXT | 联系方式（可选） |
| `created_at` | TIMESTAMPTZ | 创建时间 |

#### config（共用配置表）

| key | 说明 |
|-----|------|
| `blog_config` | 博客配置（JSON） |
| `wechat_qrcode_url` | 微信群二维码 URL |

### 4.2 Storage Bucket

| Bucket | 用途 | 权限 |
|--------|------|------|
| `blog-covers` | 文章封面图 | Public |
| `assets` | 共用资源（favicon等） | Public |

---

## 五、核心模块

### 5.1 DataService（数据服务）

位置：`public/js/script.js`

```javascript
// 主要方法
DataService.getAllPosts()           // 获取所有文章
DataService.getPostsByCategory(cat) // 按分类获取
DataService.savePost(postData)      // 保存文章
DataService.loadConfig()            // 加载配置
DataService.saveConfig(data)        // 保存配置
DataService.submitFeedback(content, contact) // 提交反馈
DataService.getFeedback()           // 获取反馈列表
DataService.isLocalMode()           // 是否本地模式
```

**特性**：
- 自动降级：Supabase 连接失败时自动切换到 LocalStorage
- 全局共享：使用 `window.blogSupabaseClient` 避免重复创建实例

### 5.2 Toast（提示组件）

```javascript
Toast.success('成功消息')
Toast.error('错误消息')
Toast.warning('警告消息')
Toast.info('提示消息')
```

### 5.3 管理员登录

- **快捷键**：`Ctrl/Cmd + Shift + K`
- **登录方式**：Supabase Auth（邮箱+密码）
- **登录后**：导航栏显示「管理」入口

---

## 六、埋点事件

统计平台：51.la
统计ID：`3OJQV6PxLHJ8VpH5`

| 事件标识 | 事件名称 | 触发时机 |
|---------|---------|---------|
| `page_view` | 页面访问 | 每个页面加载时 |
| `article_view` | 文章访问 | 查看文章详情页 |
| `column_tab_click` | 专栏切换点击 | 首页点击专栏卡片 |
| `column_more_click` | 查看更多点击 | 点击专栏"查看更多" |
| `banner_click` | Banner点击 | 点击首页 Banner |
| `nav_menu_click` | 顶部菜单点击 | 点击导航链接 |

---

## 七、Worker 功能

文件：`worker.js`

| 功能 | 路径/触发 | 说明 |
|------|----------|------|
| Favicon 重定向 | `/favicon.ico` | 重定向到 Supabase Storage |
| 健康检查 API | `/api/health-check` | 检查数据库连接状态 |
| 定时健康检查 | Cron: `0 1 * * *` | 每天 UTC 1:00（北京 9:00）执行 |
| 静态资源 | 其他路径 | 返回 `public/` 目录下的文件 |

---

## 八、开发指南

### 8.1 本地开发

```bash
cd blog/public
python3 -m http.server 8000
# 访问 http://localhost:8000
```

### 8.2 部署方式

**Cloudflare Pages（主要）**：
```bash
wrangler pages deploy public --project-name=my-blog-site
```

**GitHub Pages（备用）**：
- 推送到 `main` 分支自动部署
- 访问：`https://leo-maomao.github.io/my-blog-site/`

### 8.3 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| HTML 文件 | 小写 + 连字符 | `diary.html` |
| CSS 文件 | `style.css` | 与 Nav 统一 |
| JS 文件 | 小写 + 连字符 | `script.js` |
| 数据表 | `blog_` 前缀 | `blog_posts` |
| LocalStorage | `blog_xxx_local_v1` | `blog_posts_local_v1` |

### 8.4 代码规范

- **CSS 变量**：使用 CSS 自定义属性（`--accent`, `--bg` 等）
- **JS 模块**：使用 IIFE 模块化，避免全局污染
- **注释规范**：关键逻辑使用中文注释
- **生产代码**：禁止 console.log

---

## 九、SEO 配置

| 文件 | 用途 |
|------|------|
| `robots.txt` | 搜索引擎爬虫规则 |
| `sitemap.xml` | 站点地图 |
| `rss.xml` | RSS Feed（发布文章时自动更新） |
| `indexnow-key.txt` | IndexNow 验证（发布时自动通知搜索引擎） |
| `llms.txt` | AI/LLM 爬虫说明 |

---

## 十、提交记录

| 日期 | Commit | 说明 |
|-----|--------|------|
| 2026-01-04 | `ff5ea3c` | fix: 修复favicon.ico的500错误 |
| 2026-01-04 | `0956dc7` | chore: 清理AI总结调试代码，代码规范化 |
| 2026-01-04 | `560ea84` | fix: 修改AI请求格式为messages数组（阿里百炼标准格式） |
| 2026-01-04 | `83abee7` | fix: AI总结添加model参数，修复生成失败问题 |
| 2026-01-04 | `bb8163e` | fix: 增强AI总结响应解析并添加调试日志 |
| 2026-01-04 | `4f41643` | fix: 修复AI总结功能和点赞406错误 |
| 2025-12-11 | `8e3f6fe` | chore: 重命名IndexNow key文件为更清晰的名称 |
| 2025-12-11 | `9774b5e` | feat: 发布文章时自动更新RSS Feed |
| 2025-12-11 | `eea5a1b` | feat: 文章发布时自动通知IndexNow |
| 2025-12-10 | `96d6176` | feat: 添加RSS Feed和IndexNow支持 |
| 2025-12-10 | `0884b2e` | feat: 添加Google Search Console验证代码 |
| 2025-12-10 | `6ca9476` | feat: 添加完整SEO优化配置 |
| 2025-12-10 | `dad7e00` | chore: 代码规范化 - 清理console.log、升级Remix Icon |
| 2025-12-08 | `8468a6e` | feat: 增强响应式设计，参考nav项目优化自适应效果 |
| 2025-12-08 | `a4a44ab` | docs: 更新CLAUDE.md添加提交记录和提醒 |
| 2025-12-08 | `9010922` | fix: 修复埋点问题 |
| 2025-12-08 | `b54772f` | feat: 完成6个埋点事件的实现 |
| 2025-12-08 | `e5d81ef` | feat: 接入51.la数据统计 |
| 2025-12-07 | `45ea8f4` | feat: 多项功能优化和bug修复 |
| 2025-12-07 | `4ab73c2` | style: 统一首页和子页面的点赞数样式 |
| 2025-12-07 | `b028dbb` | feat: 添加文章点赞功能 |
| 2025-12-07 | `7bcb41f` | chore: 移除.claude配置文件夹，添加到gitignore |
| 2025-12-07 | `54ede20` | chore: 移除所有调试日志，保护项目安全 |
| 2025-12-06 | `ea8212b` | chore: 删除临时SQL文件 |
| 2025-12-06 | `eb7a081` | fix: 修复反馈列表初始状态和分离SQL文件 |
| 2025-12-06 | `0f41408` | fix: 优化反馈列表分页样式并添加数据库表注释SQL |

---

*最后更新：2026-01-04*
