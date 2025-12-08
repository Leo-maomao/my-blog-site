# 项目开发规范

## 设计资源参考

### UI组件库
- **UIverse** - https://uiverse.io/buttons
  - 提供精美的前端组件（按钮、卡片、表单等）
  - 建议在开发UI时参考使用

### 设计系统
- 使用 Remix Icon 图标库
- 与nav项目保持统一的设计语言
- 配色以蓝紫渐变为主调

## 51.la 埋点事件

本项目使用51.la进行数据统计，统计ID: `3OJQV6PxLHJ8VpH5`

| 事件标识 | 事件名称 | 说明 |
|---------|---------|------|
| `page_view` | 页面访问 | 记录页面访问 |
| `article_view` | 文章访问 | 查看文章详情页 |
| `column_tab_click` | 专栏切换点击 | 首页点击专栏卡片切换 |
| `column_more_click` | 查看更多点击 | 点击专栏"查看更多" |
| `banner_click` | Banner点击 | 点击首页Banner |
| `nav_menu_click` | 顶部菜单点击 | 点击顶部导航链接 |

## 技术栈

- 纯HTML/CSS/JavaScript（无框架）
- Supabase 云端数据库
- 51.la 数据统计
- GitHub Pages / Cloudflare Pages 部署
