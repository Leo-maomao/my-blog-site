# 更新日志

本文件记录项目的所有重要变更。

---

## [2026-01-05] UI 重构 - 组件库复用与样式统一

### 新增
- 添加博客阅读优化 CSS 变量（`--font-size-body`、`--line-height-article`、`--article-max-width`）
- 添加 `.fab-btn` FAB 悬浮操作按钮统一样式
- 分类页样式抽取为 `column.css` 公共文件

### 变更
- **Toast 组件**：复用 `components-lib` 样式，现代动画 + 左侧彩条
- **Modal 组件**：复用 `components-lib` 样式，毛玻璃遮罩 + 移动端底部抽屉
- **Pagination 组件**：复用 `components-lib` 样式，统一分页按钮
- **BackToTop 组件**：圆形 FAB 样式，hover 变蓝
- **FAB 按钮组**：微信/反馈/回到顶部三个按钮统一为圆形 FAB 样式
- **文章详情页**：优化标题、正文、引用、代码块样式
- **管理后台**：统一表单、按钮、卡片样式

### 优化
- 分类页（diary/experience/notes）移除内联样式，引用 `column.css`
- FAB 按钮支持动态定位（回到顶部隐藏时反馈按钮在底部）
- 移动端 FAB 按钮尺寸自适应

### 文件变更
- `public/css/style.css` - 添加组件库样式
- `public/css/column.css` - 分类页公共样式
- `public/index.html` - FAB 按钮添加 `fab-btn` 类
- `public/diary.html` - 移除内联样式，引用 column.css
- `public/experience.html` - 移除内联样式，引用 column.css
- `public/notes.html` - 移除内联样式，引用 column.css
- `public/post.html` - 阅读体验优化 + FAB 类
- `public/admin.html` - UI 重构
- `public/preview.html` - FAB 类

