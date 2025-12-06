-- 创建 blog_feedback 表
-- 用于存储博客网站的用户反馈

CREATE TABLE IF NOT EXISTS public.blog_feedback (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_blog_feedback_created_at ON public.blog_feedback(created_at DESC);

-- 添加表注释
COMMENT ON TABLE public.blog_feedback IS '博客用户反馈表';
COMMENT ON COLUMN public.blog_feedback.id IS '反馈ID（自增主键）';
COMMENT ON COLUMN public.blog_feedback.content IS '反馈内容';
COMMENT ON COLUMN public.blog_feedback.contact IS '联系方式（可选）';
COMMENT ON COLUMN public.blog_feedback.created_at IS '提交时间';

-- 启用 Row Level Security (RLS)
ALTER TABLE public.blog_feedback ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许所有人插入反馈（匿名用户也可以提交）
CREATE POLICY "允许所有人提交反馈" ON public.blog_feedback
    FOR INSERT
    WITH CHECK (true);

-- 创建策略：只有认证用户可以查看反馈（管理员）
CREATE POLICY "只有认证用户可以查看反馈" ON public.blog_feedback
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 如果需要允许匿名用户查看（不推荐），可以使用以下策略替代：
-- CREATE POLICY "允许所有人查看反馈" ON public.blog_feedback
--     FOR SELECT
--     USING (true);
