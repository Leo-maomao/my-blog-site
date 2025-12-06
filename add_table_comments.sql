-- ========================================
-- 为 Nav 项目的所有表添加注释
-- ========================================

-- 1. tools 表 - AI工具导航数据表
COMMENT ON TABLE public.tools IS 'AI工具导航数据表 - 存储导航站的所有AI工具信息';
COMMENT ON COLUMN public.tools.id IS '工具ID（主键）';
COMMENT ON COLUMN public.tools.name IS '工具名称';
COMMENT ON COLUMN public.tools.url IS '工具链接';
COMMENT ON COLUMN public.tools.icon IS '工具图标URL';
COMMENT ON COLUMN public.tools.description IS '工具描述';
COMMENT ON COLUMN public.tools.category IS '分类（如：写作、绘画、编程等）';
COMMENT ON COLUMN public.tools.tags IS '标签数组（JSON格式）';
COMMENT ON COLUMN public.tools.created_at IS '创建时间';
COMMENT ON COLUMN public.tools.updated_at IS '更新时间';

-- 2. config 表 - Nav项目配置表
COMMENT ON TABLE public.config IS 'Nav项目配置表 - 存储导航站的配置信息';
COMMENT ON COLUMN public.config.key IS '配置键名（主键）';
COMMENT ON COLUMN public.config.value IS '配置值（JSONB格式）';
COMMENT ON COLUMN public.config.created_at IS '创建时间';
COMMENT ON COLUMN public.config.updated_at IS '更新时间';

-- 3. feedback 表 - Nav项目用户反馈表
COMMENT ON TABLE public.feedback IS 'Nav项目用户反馈表 - 存储导航站的用户反馈和工具推荐';
COMMENT ON COLUMN public.feedback.id IS '反馈ID（自增主键）';
COMMENT ON COLUMN public.feedback.content IS '反馈内容';
COMMENT ON COLUMN public.feedback.contact IS '联系方式（可选）';
COMMENT ON COLUMN public.feedback.created_at IS '提交时间';


-- ========================================
-- 为 Blog 项目的所有表添加注释
-- ========================================

-- 1. blog_posts 表 - 博客文章表
COMMENT ON TABLE public.blog_posts IS '博客文章表 - 存储博客的所有文章内容';
COMMENT ON COLUMN public.blog_posts.id IS '文章ID（UUID主键）';
COMMENT ON COLUMN public.blog_posts.title IS '文章标题';
COMMENT ON COLUMN public.blog_posts.content IS '文章正文内容（Markdown/HTML）';
COMMENT ON COLUMN public.blog_posts.excerpt IS '文章摘要（AI生成或手动填写）';
COMMENT ON COLUMN public.blog_posts.cover IS '封面图片URL';
COMMENT ON COLUMN public.blog_posts.category IS '文章分类（diary-产品日记, experience-产品体验, notes-随手记录）';
COMMENT ON COLUMN public.blog_posts.tags IS '标签数组（JSON格式）';
COMMENT ON COLUMN public.blog_posts.published IS '是否已发布';
COMMENT ON COLUMN public.blog_posts.author IS '作者（默认为管理员邮箱）';
COMMENT ON COLUMN public.blog_posts.created_at IS '创建时间';
COMMENT ON COLUMN public.blog_posts.updated_at IS '更新时间';

-- 2. column_images 表 - 博客专栏封面图表
COMMENT ON TABLE public.column_images IS '博客专栏封面图表 - 存储各专栏的封面图片';
COMMENT ON COLUMN public.column_images.id IS 'ID（自增主键）';
COMMENT ON COLUMN public.column_images.column_key IS '专栏标识（diary-产品日记, experience-产品体验, notes-随手记录）';
COMMENT ON COLUMN public.column_images.image_url IS '封面图片URL';
COMMENT ON COLUMN public.column_images.created_at IS '创建时间';
COMMENT ON COLUMN public.column_images.updated_at IS '更新时间';

-- 3. blog_feedback 表 - 博客用户反馈表
COMMENT ON TABLE public.blog_feedback IS '博客用户反馈表 - 存储博客网站的用户反馈';
COMMENT ON COLUMN public.blog_feedback.id IS '反馈ID（自增主键）';
COMMENT ON COLUMN public.blog_feedback.content IS '反馈内容';
COMMENT ON COLUMN public.blog_feedback.contact IS '联系方式（可选）';
COMMENT ON COLUMN public.blog_feedback.created_at IS '提交时间';


-- ========================================
-- 执行完成后的验证查询
-- ========================================

-- 查看所有表的注释
SELECT
    schemaname,
    tablename,
    obj_description(pgclass.oid) as table_comment
FROM pg_tables
LEFT JOIN pg_class pgclass ON pg_tables.tablename = pgclass.relname
WHERE schemaname = 'public'
ORDER BY tablename;

-- 查看某个表的所有列注释（示例：blog_posts表）
SELECT
    a.attname AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
    col_description(a.attrelid, a.attnum) AS column_comment
FROM pg_attribute a
JOIN pg_class c ON a.attrelid = c.oid
WHERE c.relname = 'blog_posts'
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY a.attnum;
