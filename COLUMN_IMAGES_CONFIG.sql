-- 创建专栏图片配置表
CREATE TABLE IF NOT EXISTS column_images (
  id SERIAL PRIMARY KEY,
  column_key VARCHAR(50) UNIQUE NOT NULL,  -- 专栏标识: diary, experience, work, notes
  column_name VARCHAR(100) NOT NULL,        -- 专栏名称
  image_url TEXT NOT NULL,                  -- 图片URL
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 插入初始数据（使用当前的图片）
INSERT INTO column_images (column_key, column_name, image_url) VALUES
  ('diary', '产品日记', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80'),
  ('experience', '产品体验', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80'),
  ('work', '职场碎碎念', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80'),
  ('notes', '随手记录', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80')
ON CONFLICT (column_key) DO NOTHING;
