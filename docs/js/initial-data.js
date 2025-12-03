// 博客初始数据（种子数据）
// 当 Supabase 数据库为空或连接失败时使用

var BLOG_INITIAL_DATA = {
    // 文章分类配置
    categories: [
        {
            key: "diary",
            name: "产品日记",
            description: "记录产品思考的每一天",
            icon: "ri-book-2-line"
        },
        {
            key: "experience",
            name: "产品体验",
            description: "拆解优秀产品的设计亮点",
            icon: "ri-lightbulb-line"
        },
        {
            key: "work",
            name: "职场碎碎念",
            description: "工作中的感悟与成长",
            icon: "ri-briefcase-line"
        },
        {
            key: "notes",
            name: "随手记录",
            description: "灵感碎片与生活点滴",
            icon: "ri-quill-pen-line"
        }
    ],

    // 示例文章列表
    posts: [
        {
            id: 1,
            category: "diary",
            title: "【00】起点 · 给自己的一块写字地",
            excerpt: "为什么要写博客？这是给自己的一个答案。",
            cover: "https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1600&q=80",
            badge: "起点",
            badge_class: "hero-badge--orange",
            link: "./posts/diary-00.html",
            date: "2024-12-01",
            created_at: "2024-12-01T10:00:00Z",
            featured: true
        },
        {
            id: 2,
            category: "diary",
            title: "【01】把产品当故事来讲",
            excerpt: "好的产品都有一个引人入胜的故事。",
            cover: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80",
            badge: "精选",
            badge_class: "hero-badge--violet",
            link: "#",
            date: "2024-12-02",
            created_at: "2024-12-02T10:00:00Z",
            featured: true
        },
        {
            id: 3,
            category: "diary",
            title: "【02】那些被忽略的小细节",
            excerpt: "细节决定成败，产品设计中的微交互。",
            cover: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80",
            badge: "新思考",
            badge_class: "hero-badge--green",
            link: "#",
            date: "2024-12-03",
            created_at: "2024-12-03T10:00:00Z",
            featured: true
        }
    ],

    // 博客配置
    config: {
        site_name: "毛毛的产品日记",
        site_description: "永远相信美好的事即将发生",
        author: "毛毛",
        social_links: {
            github: "https://github.com/Leo-maomao",
            blog_nav: "https://your-nav-site-url.com"
        }
    }
};

// 如果需要，可以暴露给全局
if (typeof window !== 'undefined') {
    window.BLOG_INITIAL_DATA = BLOG_INITIAL_DATA;
}
