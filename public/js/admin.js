// 博客管理系统

(function() {
    // AI 摘要生成配置
    var AI_WORKER_URL = 'https://ai-api.leo-maomao.workers.dev/summary';

    // SEO 自动化：IndexNow 配置
    var INDEXNOW_KEY = 'indexnow-key';
    var SITE_URL = 'https://my-blog-site.leo-maomao.workers.dev';

    // 通知搜索引擎抓取新页面（IndexNow）
    async function notifyIndexNow(postId) {
        var pageUrl = SITE_URL + '/post.html?id=' + postId;
        var endpoints = [
            'https://api.indexnow.org/indexnow',
            'https://www.bing.com/indexnow'
        ];

        for (var i = 0; i < endpoints.length; i++) {
            try {
                var url = endpoints[i] + '?url=' + encodeURIComponent(pageUrl) + '&key=' + INDEXNOW_KEY;
                fetch(url, { method: 'GET', mode: 'no-cors' });
            } catch (e) {
                // 静默失败，不影响用户体验
            }
        }
    }

    // 自动更新 RSS Feed
    async function updateRSSFeed() {
        try {
            // 获取最新20篇已发布文章
            var { data: posts, error } = await supabase
                .from('blog_posts')
                .select('id, title, excerpt, category, created_at')
                .eq('published', true)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error || !posts) return;

            var categoryMap = {
                'diary': '产品日记',
                'experience': '产品体验',
                'notes': '随手记录'
            };

            var items = '';
            for (var i = 0; i < posts.length; i++) {
                var post = posts[i];
                var pubDate = new Date(post.created_at).toUTCString();
                var category = categoryMap[post.category] || post.category;
                var link = SITE_URL + '/post.html?id=' + post.id;
                var title = (post.title || '无标题').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                var desc = (post.excerpt || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

                items += '<item><title>' + title + '</title><link>' + link + '</link><description>' + desc + '</description><pubDate>' + pubDate + '</pubDate><guid>' + link + '</guid><category>' + category + '</category></item>';
            }

            var rssContent = '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>毛毛的产品日记</title><description>一个产品经理的个人博客</description><link>' + SITE_URL + '/</link><language>zh-CN</language><lastBuildDate>' + new Date().toUTCString() + '</lastBuildDate>' + items + '</channel></rss>';

            // 存储到 Supabase config 表
            await supabase.from('config').upsert({
                key: 'rss_feed',
                value: rssContent
            }, { onConflict: 'key' });

        } catch (e) {
            // 静默失败
        }
    }

    // AI 生成摘要函数
    async function generateSummaryWithAI(title, content) {
        if (!title || !title.trim()) {
            throw new Error('缺少文章标题');
        }

        if (!content || content.trim().length < 100) {
            throw new Error('文章内容过短，无法生成摘要');
        }

        var prompt = '请为以下文章生成一段简洁的摘要（150字以内）：\n\n标题：' + title.trim() + '\n\n内容：' + content.substring(0, 5000);

        console.log('[AI摘要] 发送请求到:', AI_WORKER_URL);
        console.log('[AI摘要] 请求内容:', { prompt: prompt });

        var response = await fetch(AI_WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt
            })
        });

        console.log('[AI摘要] 响应状态:', response.status, response.statusText);

        if (!response.ok) {
            var errorText = await response.text();
            console.error('[AI摘要] 错误响应:', errorText);
            try {
                var errorJson = JSON.parse(errorText);
                console.error('[AI摘要] 错误详情:', errorJson);
                throw new Error('AI生成失败: ' + (errorJson.error || errorJson.message || errorText));
            } catch (e) {
                throw new Error('AI生成失败: ' + response.status + ' - ' + errorText);
            }
        }

        var data = await response.json();

        // 临时调试日志 - 查看AI响应格式
        console.log('[AI摘要] Worker成功响应:', data);

        // 检查是否有错误（即使状态码是200）
        if (data.error) {
            console.error('[AI摘要] Worker返回错误:', data.error);
            throw new Error('AI生成失败: ' + (data.error.message || JSON.stringify(data.error)));
        }

        // 尝试多种可能的响应格式
        var summary = data.summary || data.result || data.response || data.text || data.content;

        // 如果是嵌套结构
        if (!summary && data.data) {
            summary = data.data.result || data.data.response || data.data.text || data.data.content;
        }

        // 如果是output结构（阿里百炼格式）
        if (!summary && data.output) {
            summary = data.output.text || data.output.content;
        }

        // 如果是choices格式（OpenAI格式）
        if (!summary && data.choices && data.choices.length > 0) {
            summary = data.choices[0].message?.content || data.choices[0].text;
        }

        if (!summary || !summary.trim()) {
            throw new Error('AI返回内容为空，响应格式：' + JSON.stringify(data).substring(0, 200));
        }

        return summary.trim();
    }

    // 使用全局共享的 Supabase 客户端（如果存在），否则创建新的
    var supabase;

    if (window.blogSupabaseClient) {
        supabase = window.blogSupabaseClient;
    } else {
        var SUPABASE_URL = "https://jqsmoygkbqukgnwzkxvq.supabase.co";
        var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxc21veWdrYnF1a2dud3preHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3Mjk0MzYsImV4cCI6MjA4MDMwNTQzNn0.RrGVhh2TauEmGE4Elc2f3obUmZKHVdYVVMaz2kxKlW4";
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false
            },
            global: {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Prefer': 'return=representation'
                }
            }
        });
        window.blogSupabaseClient = supabase;
    }

    // 注册 ImageResize 模块（如果可用）
    if (window.ImageResize && window.ImageResize.default) {
        Quill.register('modules/imageResize', window.ImageResize.default);
    }

    // Quill编辑器初始化
    var quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            ['link', 'image', 'video'],
            ['clean']
        ]
    };

    // 如果 ImageResize 可用，添加图片缩放模块
    if (window.ImageResize && window.ImageResize.default) {
        quillModules.imageResize = {
            displayStyles: {
                backgroundColor: 'black',
                border: 'none',
                color: 'white'
            },
            modules: ['Resize', 'DisplaySize', 'Toolbar']
        };
    }

    var quill = new Quill('#editor', {
        theme: 'snow',
        placeholder: '开始写作...',
        modules: quillModules
    });

    // 自动保存相关变量
    var autoSaveTimer = null;
    var AUTOSAVE_KEY = 'blog_draft';
    var AUTOSAVE_DELAY = 3000; // 3秒后自动保存

    // 保存草稿到localStorage
    function saveDraft() {
        var draft = {
            title: document.getElementById('postTitle').value,
            category: document.getElementById('postCategory').value,
            excerpt: document.getElementById('postExcerpt').value,
            likes: document.getElementById('postLikes').value,
            views: document.getElementById('postViews').value,
            cover: document.getElementById('postCover').value,
            content: quill.root.innerHTML,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
    }

    // 恢复草稿
    function restoreDraft() {
        var draftJson = localStorage.getItem(AUTOSAVE_KEY);
        if (!draftJson) return false;

        try {
            var draft = JSON.parse(draftJson);
            var savedTime = new Date(draft.savedAt);
            var timeAgo = Math.round((Date.now() - savedTime.getTime()) / 1000 / 60);
            var timeStr = timeAgo < 60 ? timeAgo + '分钟前' : Math.round(timeAgo / 60) + '小时前';

            if (confirm('发现' + timeStr + '保存的草稿，是否恢复？\n\n标题：' + (draft.title || '(无标题)'))) {
                document.getElementById('postTitle').value = draft.title || '';
                document.getElementById('postCategory').value = draft.category || '';
                document.getElementById('postExcerpt').value = draft.excerpt || '';
                document.getElementById('postLikes').value = draft.likes || '';
                document.getElementById('postViews').value = draft.views || '';
                document.getElementById('postCover').value = draft.cover || '';
                if (draft.content) {
                    quill.root.innerHTML = draft.content;
                }
                if (draft.cover) {
                    coverPreviewImg.src = draft.cover;
                    coverPreview.style.display = 'block';
                }
                Toast.success('草稿已恢复');
                return true;
            } else {
                localStorage.removeItem(AUTOSAVE_KEY);
                return false;
            }
        } catch (e) {
            localStorage.removeItem(AUTOSAVE_KEY);
            return false;
        }
    }

    // 触发自动保存（防抖）
    function triggerAutoSave() {
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
        }
        autoSaveTimer = setTimeout(function() {
            saveDraft();
        }, AUTOSAVE_DELAY);
    }

    // 监听编辑器内容变化，自动设置新插入图片的默认宽度为30%
    quill.on('text-change', function(delta, oldDelta, source) {
        if (source === 'user') {
            // 触发自动保存
            triggerAutoSave();

            delta.ops.forEach(function(op) {
                if (op.insert && op.insert.image) {
                    // 使用setTimeout确保图片已经插入DOM
                    setTimeout(function() {
                        var images = quill.root.querySelectorAll('img:not([data-resized])');
                        images.forEach(function(img) {
                            img.style.width = '30%';
                            img.style.height = 'auto';
                            img.style.maxWidth = '100%';
                            img.setAttribute('data-resized', 'true');
                        });
                    }, 10);
                }
            });
        }
    });

    // 监听表单字段变化，触发自动保存
    ['postTitle', 'postCategory', 'postExcerpt', 'postLikes', 'postViews'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', triggerAutoSave);
            el.addEventListener('change', triggerAutoSave);
        }
    });

    // 颜色记忆功能：记住上次使用的颜色
    var lastTextColor = localStorage.getItem('quill_last_text_color') || '#000000';
    var lastBgColor = localStorage.getItem('quill_last_bg_color') || '#ffffff';

    // 监听颜色选择变化
    quill.on('selection-change', function(range, oldRange, source) {
        if (range) {
            var format = quill.getFormat(range);
            if (format.color) {
                lastTextColor = format.color;
                localStorage.setItem('quill_last_text_color', lastTextColor);
            }
            if (format.background) {
                lastBgColor = format.background;
                localStorage.setItem('quill_last_bg_color', lastBgColor);
            }
        }
    });

    // 自定义颜色按钮行为：点击直接应用上次颜色，长按或右键打开颜色选择器
    var colorButtons = document.querySelectorAll('.ql-color, .ql-background');
    colorButtons.forEach(function(btn) {
        var isBackground = btn.classList.contains('ql-background');
        var clickTimer = null;

        btn.addEventListener('mousedown', function(e) {
            clickTimer = setTimeout(function() {
                // 长按：打开颜色选择器（默认行为）
                clickTimer = null;
            }, 300);
        });

        btn.addEventListener('mouseup', function(e) {
            if (clickTimer) {
                clearTimeout(clickTimer);
                // 短按：直接应用上次颜色
                e.preventDefault();
                e.stopPropagation();
                var range = quill.getSelection();
                if (range) {
                    if (isBackground) {
                        quill.format('background', lastBgColor);
                    } else {
                        quill.format('color', lastTextColor);
                    }
                }
                return false;
            }
        });

        btn.addEventListener('click', function(e) {
            if (!clickTimer) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });
    });

    // 添加快捷键支持：Ctrl+1~6 设置标题，Ctrl+0 取消标题
    quill.keyboard.addBinding({
        key: '1',
        shortKey: true,
        handler: function() {
            quill.format('header', 1);
            return false;
        }
    });
    quill.keyboard.addBinding({
        key: '2',
        shortKey: true,
        handler: function() {
            quill.format('header', 2);
            return false;
        }
    });
    quill.keyboard.addBinding({
        key: '3',
        shortKey: true,
        handler: function() {
            quill.format('header', 3);
            return false;
        }
    });
    quill.keyboard.addBinding({
        key: '4',
        shortKey: true,
        handler: function() {
            quill.format('header', 4);
            return false;
        }
    });
    quill.keyboard.addBinding({
        key: '5',
        shortKey: true,
        handler: function() {
            quill.format('header', 5);
            return false;
        }
    });
    quill.keyboard.addBinding({
        key: '6',
        shortKey: true,
        handler: function() {
            quill.format('header', 6);
            return false;
        }
    });
    quill.keyboard.addBinding({
        key: '0',
        shortKey: true,
        handler: function() {
            quill.format('header', false);
            return false;
        }
    });

    // DOM元素
    var loginModal = document.getElementById('loginModal');
    var loginEmail = document.getElementById('loginEmail');
    var loginPassword = document.getElementById('loginPassword');
    var loginSubmitBtn = document.getElementById('loginSubmitBtn');
    var loginCancelBtn = document.getElementById('loginCancelBtn');
    var loginModalClose = document.getElementById('loginModalClose');
    var logoutBtn = document.getElementById('logoutBtn');
    var reloginBtn = document.getElementById('reloginBtn');
    var adminEmail = document.getElementById('adminEmail');
    var postForm = document.getElementById('postForm');
    var resetBtn = document.getElementById('resetBtn');
    var previewBtn = document.getElementById('previewBtn');
    var postsList = document.getElementById('postsList');
    var postCoverFile = document.getElementById('postCoverFile');
    var coverPreview = document.getElementById('coverPreview');
    var coverPreviewImg = document.getElementById('coverPreviewImg');
    var removeCoverBtn = document.getElementById('removeCoverBtn');

    // 图片尺寸调整modal元素
    var imageResizeModal = document.getElementById('imageResizeModal');
    var imageWidthInput = document.getElementById('imageWidthInput');
    var imageResizeConfirmBtn = document.getElementById('imageResizeConfirmBtn');
    var imageResizeCancelBtn = document.getElementById('imageResizeCancelBtn');
    var imageResizeModalClose = document.getElementById('imageResizeModalClose');
    var currentResizingImage = null; // 当前正在调整的图片

    var currentUser = null;
    var isEditMode = false;
    var allPosts = []; // 存储所有文章用于筛选
    var currentFilter = 'all'; // 当前选中的筛选分类
    var isLoadingPosts = false; // 防止重复加载

    // Tab切换
    var tabs = document.querySelectorAll('.admin-tab');
    var panels = document.querySelectorAll('.admin-panel');

    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            var targetTab = this.getAttribute('data-tab');

            tabs.forEach(function(t) { t.classList.remove('active'); });
            panels.forEach(function(p) { p.classList.remove('active'); });

            this.classList.add('active');
            document.getElementById('panel-' + targetTab).classList.add('active');

            if (targetTab === 'list' && !isLoadingPosts) {
                loadPostsList();
            }
        });
    });

    // 图片上传和预览
    postCoverFile.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;

        // 验证文件类型
        if (!file.type.match('image/(jpeg|png|webp|jpg)')) {
            Toast.error('请上传 JPG、PNG 或 WebP 格式的图片');
            postCoverFile.value = '';
            return;
        }

        // 验证文件大小（限制5MB）
        if (file.size > 5 * 1024 * 1024) {
            Toast.error('图片大小不能超过 5MB');
            postCoverFile.value = '';
            return;
        }

        // 预览图片
        var reader = new FileReader();
        reader.onload = function(event) {
            coverPreviewImg.src = event.target.result;
            coverPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    // 移除封面图
    removeCoverBtn.addEventListener('click', function() {
        postCoverFile.value = '';
        document.getElementById('postCover').value = '';
        coverPreview.style.display = 'none';
        coverPreviewImg.src = '';
    });

    // 登录模态框
    function showLoginModal() {
        loginModal.classList.add('is-visible');
        setTimeout(function() {
            loginEmail.focus();
        }, 100);
    }

    function closeLoginModal() {
        loginModal.classList.remove('is-visible');
        loginEmail.value = '';
        loginPassword.value = '';
    }

    loginModalClose.addEventListener('click', closeLoginModal);
    loginCancelBtn.addEventListener('click', closeLoginModal);

    // 登录处理
    loginSubmitBtn.addEventListener('click', async function() {
        var email = loginEmail.value.trim();
        var password = loginPassword.value.trim();

        if (!email || !password) {
            Toast.error('请输入邮箱和密码');
            return;
        }

        try {
            var { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            currentUser = data.user;
            closeLoginModal();
            updateUIForLogin();
            Toast.success('登录成功！');
        } catch (error) {
            Toast.error('登录失败：' + error.message);
        }
    });

    // 退出登录
    logoutBtn.addEventListener('click', async function() {
        if (!confirm('确定要退出登录吗？')) return;

        try {
            await supabase.auth.signOut();
            currentUser = null;
            updateUIForLogout();
            Toast.success('已退出登录');
        } catch (error) {
            Toast.error('退出失败');
        }
    });

    // 重新登录按钮
    reloginBtn.addEventListener('click', function() {
        showLoginModal();
    });

    // 更新UI
    function updateUIForLogin() {
        adminEmail.textContent = currentUser.email;
        logoutBtn.style.display = 'block';
        reloginBtn.style.display = 'none';
        document.body.classList.add('is-admin');
    }

    function updateUIForLogout() {
        
        
        adminEmail.textContent = '未登录';
        logoutBtn.style.display = 'none';
        reloginBtn.style.display = 'block';
        
        document.body.classList.remove('is-admin');
    }

    // 检查登录状态
    async function checkAuth() {
        try {
            

            var { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                throw error;
            }

            

            if (session && session.user) {
                currentUser = session.user;
                updateUIForLogin();
                
            } else {
                
                updateUIForLogout(); // 显示重新登录按钮
            }
        } catch (error) {
            updateUIForLogout(); // 显示重新登录按钮
        }
    }

    // 重置表单
    resetBtn.addEventListener('click', function() {
        if (!confirm('确定要重置表单吗？')) return;
        resetForm();
    });

    // 预览按钮
    previewBtn.addEventListener('click', function() {
        var title = document.getElementById('postTitle').value;
        var content = quill.root.innerHTML;
        var cover = document.getElementById('postCover').value;

        if (!title) {
            Toast.error('请输入文章标题');
            return;
        }

        if (!content || content === '<p><br></p>') {
            Toast.error('请输入文章内容');
            return;
        }

        // 创建预览数据对象
        var previewData = {
            title: title,
            content: content,
            cover: cover,
            created_at: new Date().toISOString()
        };

        // 保存到 localStorage
        localStorage.setItem('blog_preview_data', JSON.stringify(previewData));

        // 在新窗口打开预览页面
        window.open('./preview.html', '_blank');
    });

    function resetForm() {
        document.getElementById('postTitle').value = '';
        document.getElementById('postCategory').value = '';
        document.getElementById('postExcerpt').value = '';
        document.getElementById('postCover').value = '';
        document.getElementById('postId').value = '';
        document.getElementById('postLikes').value = '';
        document.getElementById('postViews').value = '';
        postCoverFile.value = '';
        coverPreview.style.display = 'none';
        coverPreviewImg.src = '';
        quill.setContents([]);
        isEditMode = false;
        postForm.querySelector('.btn-primary').innerHTML = '<i class="ri-send-plane-fill"></i> 发布文章';
    }

    // 上传图片到 Supabase Storage
    async function uploadCoverImage(file) {
        try {
            // 生成唯一文件名
            var timestamp = Date.now();
            var ext = file.name.split('.').pop();
            var filename = 'cover_' + timestamp + '.' + ext;

            

            // 上传到 Supabase Storage
            var { data, error } = await supabase.storage
                .from('blog-covers')
                .upload(filename, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // 获取公共URL
            var { data: urlData } = supabase.storage
                .from('blog-covers')
                .getPublicUrl(filename);

            
            return urlData.publicUrl;
        } catch (error) {
            throw error;
        }
    }

    // 发布/更新文章
    postForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        var title = document.getElementById('postTitle').value.trim();
        var category = document.getElementById('postCategory').value;
        var excerpt = document.getElementById('postExcerpt').value.trim();
        var cover = document.getElementById('postCover').value.trim();
        var content = quill.root.innerHTML;
        var postId = document.getElementById('postId').value;
        var coverFile = postCoverFile.files[0];
        var likesInput = document.getElementById('postLikes').value;
        var likes = likesInput ? parseInt(likesInput) : 0;
        var viewsInput = document.getElementById('postViews').value;
        var views = viewsInput ? parseInt(viewsInput) : 0;

        if (!title || !category) {
            Toast.error('请填写标题和分类');
            return;
        }

        if (!content || content === '<p><br></p>') {
            Toast.error('请填写文章内容');
            return;
        }

        // 如果没有填写摘要，使用AI自动生成
        if (!excerpt) {
            Toast.info('正在生成文章摘要...');
            try {
                var textContent = quill.getText().trim();
                excerpt = await generateSummaryWithAI(title, textContent);
                Toast.success('AI摘要生成成功');
            } catch (error) {
                console.error('[AI摘要] 完整错误:', error);
                // 显示详细错误信息，让用户有时间查看
                var errorMsg = 'AI生成失败：' + error.message;
                alert('⚠️ AI摘要生成失败\n\n错误详情：\n' + errorMsg + '\n\n将使用兜底策略（截取前200字）');
                Toast.warning('AI生成失败，已自动截取前200字作为摘要');
                // 如果AI生成失败，降级为截取前200字
                var textContent = quill.getText().trim();
                excerpt = textContent.substring(0, 200) + (textContent.length > 200 ? '...' : '');
            }
        }

        try {
            // 如果有新上传的封面图，先上传
            if (coverFile) {
                Toast.info('正在上传封面图...');
                cover = await uploadCoverImage(coverFile);
            }

            var postData = {
                title: title,
                category: category,
                excerpt: excerpt,
                cover: cover || null,
                content: content,
                published: true,
                likes: likes,
                views: views,
                updated_at: new Date().toISOString()
            };

            var newPostId = null;

            if (isEditMode && postId) {
                // 更新文章
                var { error } = await supabase
                    .from('blog_posts')
                    .update(postData)
                    .eq('id', postId);

                if (error) throw error;
                Toast.success('文章更新成功！');
                newPostId = postId;
            } else {
                // 新建文章
                postData.created_at = new Date().toISOString();
                var { data, error } = await supabase
                    .from('blog_posts')
                    .insert([postData])
                    .select('id')
                    .single();

                if (error) throw error;
                Toast.success('文章发布成功！');
                newPostId = data.id;
            }

            // 清除自动保存的草稿
            localStorage.removeItem('blog_draft');

            resetForm();

            // SEO自动化：通知搜索引擎抓取新页面 + 更新RSS
            if (newPostId) {
                notifyIndexNow(newPostId);
                updateRSSFeed();
            }

            // 跳转到文章页面
            if (newPostId) {
                setTimeout(function() {
                    window.location.href = './post.html?id=' + newPostId;
                }, 500);
            }
        } catch (error) {
            if (error.message && error.message.includes('storage')) {
                Toast.error('封面图上传失败：' + error.message);
            } else {
                Toast.error('操作失败：' + error.message);
            }
        }
    });

    // 加载文章列表
    async function loadPostsList() {
        if (isLoadingPosts) {
            
            return;
        }

        isLoadingPosts = true;
        postsList.innerHTML = '<div class="loading"><i class="ri-loader-4-line" style="animation: spin 1s linear infinite;"></i> 加载中...</div>';

        try {
            
            var startTime = Date.now();

            var { data: posts, error } = await supabase
                .from('blog_posts')
                .select('id, title, category, excerpt, cover, created_at, published, likes, views')
                .order('created_at', { ascending: false });

            if (error) throw error;

            var loadTime = Date.now() - startTime;
            

            if (!posts || posts.length === 0) {
                postsList.innerHTML = '<div class="empty-state"><i class="ri-file-text-line"></i><p>还没有发布任何文章</p></div>';
                updateCategoryCounts({});
                return;
            }

            // 保存所有文章到全局变量
            allPosts = posts;

            // 更新分类计数
            updateCategoryCounts(posts);

            // 根据当前筛选显示文章
            renderFilteredPosts();

        } catch (error) {
            postsList.innerHTML = '<div class="empty-state"><i class="ri-error-warning-line"></i><p>加载失败：' + error.message + '</p></div>';
        } finally {
            isLoadingPosts = false;
        }
    }

    // 更新分类计数
    function updateCategoryCounts(posts) {
        var counts = {
            all: posts.length || 0,
            diary: 0,
            experience: 0,
            notes: 0
        };

        if (Array.isArray(posts)) {
            posts.forEach(function(post) {
                if (counts.hasOwnProperty(post.category)) {
                    counts[post.category]++;
                }
            });
        }

        // 更新UI
        document.getElementById('count-all').textContent = counts.all;
        document.getElementById('count-diary').textContent = counts.diary;
        document.getElementById('count-experience').textContent = counts.experience;
        document.getElementById('count-notes').textContent = counts.notes;
    }

    // 渲染筛选后的文章列表
    function renderFilteredPosts() {
        var filteredPosts = currentFilter === 'all'
            ? allPosts
            : allPosts.filter(function(post) { return post.category === currentFilter; });

        if (filteredPosts.length === 0) {
            postsList.innerHTML = '<div class="empty-state"><i class="ri-file-text-line"></i><p>该分类下暂无文章</p></div>';
            return;
        }

        var html = '';
        filteredPosts.forEach(function(post) {
            var categoryNames = {
                'diary': '产品日记',
                'experience': '产品体验',
                'notes': '随手记录'
            };

            var createdDate = new Date(post.created_at).toLocaleDateString('zh-CN');

            // 封面图：如果有则显示，否则显示占位图标
            var coverHtml = '';
            if (post.cover) {
                coverHtml = '<div class="post-cover" style="background-image: url(\'' + post.cover + '\');"></div>';
            } else {
                coverHtml = '<div class="post-cover post-cover-empty"><i class="ri-image-line"></i></div>';
            }

            html += '<div class="post-item">';
            html += coverHtml;
            html += '  <div class="post-info">';
            html += '    <div class="post-title">' + escapeHtml(post.title) + '</div>';
            html += '    <div class="post-meta">';
            html += '      <span><i class="ri-folder-line"></i> ' + (categoryNames[post.category] || post.category) + '</span>';
            html += '      <span><i class="ri-calendar-line"></i> ' + createdDate + '</span>';
            html += '      <span><i class="ri-heart-fill" style="color:#ef4444;"></i> ' + (post.likes || 0) + '</span>';
            html += '      <span><i class="ri-eye-line"></i> ' + (post.views || 0) + '</span>';
            html += '    </div>';
            html += '    <div class="post-excerpt">' + escapeHtml(post.excerpt || '') + '</div>';
            html += '  </div>';
            html += '  <div class="post-actions">';
            html += '    <button class="post-action-btn edit" data-id="' + post.id + '">';
            html += '      <i class="ri-edit-line"></i> 编辑';
            html += '    </button>';
            html += '    <button class="post-action-btn delete" data-id="' + post.id + '">';
            html += '      <i class="ri-delete-bin-line"></i> 删除';
            html += '    </button>';
            html += '  </div>';
            html += '</div>';
        });

        postsList.innerHTML = html;

        // 绑定编辑和删除事件
        postsList.querySelectorAll('.post-action-btn.edit').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var postId = this.getAttribute('data-id');
                editPost(postId);
            });
        });

        postsList.querySelectorAll('.post-action-btn.delete').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var postId = this.getAttribute('data-id');
                deletePost(postId);
            });
        });
    }

    // 初始化筛选按钮
    function initFilterButtons() {
        var filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var category = this.getAttribute('data-category');

                // 更新按钮状态
                filterButtons.forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');

                // 更新当前筛选
                currentFilter = category;

                // 重新渲染列表
                renderFilteredPosts();
            });
        });
    }

    // 编辑文章
    async function editPost(postId) {
        try {
            var { data: post, error } = await supabase
                .from('blog_posts')
                .select('*')
                .eq('id', postId)
                .single();

            if (error) throw error;

            // 填充表单
            document.getElementById('postTitle').value = post.title;
            document.getElementById('postCategory').value = post.category;
            document.getElementById('postExcerpt').value = post.excerpt || '';
            document.getElementById('postCover').value = post.cover || '';
            document.getElementById('postId').value = post.id;
            document.getElementById('postLikes').value = post.likes || 0;
            document.getElementById('postViews').value = post.views || 0;
            quill.root.innerHTML = post.content;

            // 显示现有封面图（如果有）
            if (post.cover) {
                coverPreviewImg.src = post.cover;
                coverPreview.style.display = 'block';
            } else {
                coverPreview.style.display = 'none';
            }

            isEditMode = true;
            postForm.querySelector('.btn-primary').innerHTML = '<i class="ri-save-line"></i> 更新文章';

            // 切换到新建标签
            document.querySelector('[data-tab="new"]').click();

            // 滚动到顶部
            window.scrollTo({ top: 0, behavior: 'smooth' });

            Toast.info('加载文章成功，可以开始编辑');
        } catch (error) {
            Toast.error('加载文章失败：' + error.message);
        }
    }

    // 删除文章
    async function deletePost(postId) {
        if (!confirm('确定要删除这篇文章吗？此操作不可恢复！')) return;

        try {
            var { error } = await supabase
                .from('blog_posts')
                .delete()
                .eq('id', postId);

            if (error) throw error;

            Toast.success('文章已删除');
            loadPostsList();
        } catch (error) {
            Toast.error('删除失败：' + error.message);
        }
    }

    // HTML转义
    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 检查是否从详情页跳转过来编辑文章
    async function checkEditMode() {
        var urlParams = new URLSearchParams(window.location.search);
        var editPostId = urlParams.get('edit');

        if (editPostId) {
            

            // 切换到编辑标签（发布新文章标签）
            tabs.forEach(function(t) { t.classList.remove('active'); });
            panels.forEach(function(p) { p.classList.remove('active'); });

            document.querySelector('[data-tab="new"]').classList.add('active');
            document.getElementById('panel-new').classList.add('active');

            // 加载文章数据
            try {
                var { data: post, error } = await supabase
                    .from('blog_posts')
                    .select('*')
                    .eq('id', editPostId)
                    .single();

                if (error) throw error;

                if (post) {
                    // 填充表单
                    document.getElementById('postId').value = post.id;
                    document.getElementById('postTitle').value = post.title || '';
                    document.getElementById('postCategory').value = post.category || '';
                    document.getElementById('postExcerpt').value = post.excerpt || '';
                    document.getElementById('postCover').value = post.cover || '';
                    document.getElementById('postLikes').value = post.likes || 0;
                    document.getElementById('postViews').value = post.views || 0;

                    // 加载编辑器内容
                    if (post.content) {
                        quill.root.innerHTML = post.content;
                    }

                    // 显示封面预览
                    if (post.cover) {
                        coverPreviewImg.src = post.cover;
                        coverPreview.style.display = 'block';
                    }

                    isEditMode = true;

                    Toast.success('文章加载成功，可以开始编辑');
                    return true;
                }
            } catch (error) {
                Toast.error('加载文章失败: ' + error.message);
            }
        }
        return false;
    }

    // 页面加载时检查登录状态
    checkAuth().then(function() {
        // 登录成功后检查是否需要加载文章
        checkEditMode().then(function(hasEditPost) {
            // 如果不是编辑模式，尝试恢复草稿
            if (!hasEditPost) {
                restoreDraft();
            }
        });
    });

    // 初始化筛选按钮
    initFilterButtons();

    // ========== 图片尺寸调整功能 ==========

    // 图片点击事件
    quill.root.addEventListener('click', function(e) {
        if (e.target && e.target.tagName === 'IMG') {
            currentResizingImage = e.target;
            var currentWidth = e.target.style.width || e.target.getAttribute('width') || '';
            imageWidthInput.value = currentWidth;
            imageResizeModal.classList.add('is-visible');
            imageWidthInput.focus();
        }
    });

    // 确认调整尺寸
    imageResizeConfirmBtn.addEventListener('click', function() {
        var newWidth = imageWidthInput.value.trim();

        if (newWidth && currentResizingImage) {
            // 如果是纯数字，自动添加px
            if (/^\d+$/.test(newWidth)) {
                newWidth = newWidth + 'px';
            }

            // 设置图片尺寸 - 直接修改DOM并强制重绘
            currentResizingImage.style.width = newWidth;
            currentResizingImage.style.height = 'auto';
            currentResizingImage.style.maxWidth = '100%';
            currentResizingImage.setAttribute('width', newWidth);

            // 强制浏览器重绘
            currentResizingImage.style.display = 'none';
            currentResizingImage.offsetHeight; // 触发重排
            currentResizingImage.style.display = '';

            Toast.success('图片尺寸已调整为 ' + newWidth);
        }

        // 关闭modal
        imageResizeModal.classList.remove('is-visible');
        currentResizingImage = null;
        imageWidthInput.value = '';
    });

    // 取消调整
    imageResizeCancelBtn.addEventListener('click', function() {
        imageResizeModal.classList.remove('is-visible');
        currentResizingImage = null;
        imageWidthInput.value = '';
    });

    // 点击关闭按钮
    imageResizeModalClose.addEventListener('click', function() {
        imageResizeModal.classList.remove('is-visible');
        currentResizingImage = null;
        imageWidthInput.value = '';
    });

    // 按Enter确认
    imageWidthInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            imageResizeConfirmBtn.click();
        }
    });

    // 按Esc取消
    imageResizeModal.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            imageResizeCancelBtn.click();
        }
    });

    // ========== 专栏封面图更新功能 ==========

    var columnSelect = document.getElementById('columnSelect');
    var columnImageFile = document.getElementById('columnImageFile');
    var currentImagePreview = document.getElementById('currentImagePreview');
    var currentImage = document.getElementById('currentImage');
    var uploadPreview = document.getElementById('uploadPreview');
    var uploadPreviewImg = document.getElementById('uploadPreviewImg');
    var uploadColumnImageBtn = document.getElementById('uploadColumnImageBtn');
    var selectedFile = null;
    var selectedColumn = '';

    // 专栏图片映射（从数据库加载）
    var columnImages = {};

    // 从数据库加载专栏图片
    async function loadColumnImages() {
        try {
            var { data, error } = await supabase
                .from('column_images')
                .select('*');

            if (error) throw error;

            if (data) {
                data.forEach(function(item) {
                    columnImages[item.column_key] = item.image_url;
                });
                
            }
        } catch (error) {
            // 使用默认值
            columnImages = {
                'diary': 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
                'experience': 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
                'notes': 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80'
            };
        }
    }

    // 初始化加载
    loadColumnImages();

    // 选择专栏时显示当前图片
    columnSelect.addEventListener('change', function() {
        selectedColumn = this.value;
        if (selectedColumn) {
            currentImage.src = columnImages[selectedColumn];
            currentImagePreview.style.display = 'block';
        } else {
            currentImagePreview.style.display = 'none';
            uploadPreview.style.display = 'none';
            uploadColumnImageBtn.disabled = true;
        }
    });

    // 预览新选择的图片
    columnImageFile.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (file && selectedColumn) {
            selectedFile = file;
            var reader = new FileReader();
            reader.onload = function(e) {
                uploadPreviewImg.src = e.target.result;
                uploadPreview.style.display = 'block';
                uploadColumnImageBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        }
    });

    // 上传并更新图片
    uploadColumnImageBtn.addEventListener('click', async function() {
        if (!selectedFile || !selectedColumn) {
            Toast.error('请选择专栏和图片');
            return;
        }

        try {
            uploadColumnImageBtn.disabled = true;
            uploadColumnImageBtn.innerHTML = '<i class="ri-loader-4-line" style="animation: spin 1s linear infinite;"></i> 上传中...';

            // 生成唯一文件名
            var timestamp = Date.now();
            var fileName = 'column-' + selectedColumn + '-' + timestamp + '-' + selectedFile.name;

            // 上传到Supabase Storage
            var { data, error } = await supabase.storage
                .from('blog-images')
                .upload(fileName, selectedFile, {
                    cacheControl: '31536000',
                    upsert: false
                });

            if (error) throw error;

            // 获取公开URL
            var { data: urlData } = supabase.storage
                .from('blog-images')
                .getPublicUrl(fileName);

            var publicUrl = urlData.publicUrl;

            // 保存到数据库
            var { error: updateError } = await supabase
                .from('column_images')
                .update({
                    image_url: publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('column_key', selectedColumn);

            if (updateError) throw updateError;

            // 更新本地缓存
            columnImages[selectedColumn] = publicUrl;
            currentImage.src = publicUrl;

            Toast.success('上传成功！图片已应用到首页和子页面');

            // 清理状态
            columnImageFile.value = '';
            uploadPreview.style.display = 'none';
            selectedFile = null;

            

        } catch (error) {
            Toast.error('上传失败: ' + error.message);
        } finally {
            uploadColumnImageBtn.disabled = false;
            uploadColumnImageBtn.innerHTML = '<i class="ri-upload-cloud-line"></i> 上传并更新';
        }
    });

    
})();

// 用户反馈管理功能
(function() {
    var feedbackList = document.getElementById('feedbackList');
    var pageSizeSelect = document.getElementById('feedbackPageSize');
    var refreshBtn = document.getElementById('refreshFeedbackBtn');
    var prevBtn = document.getElementById('feedbackPrevBtn');
    var nextBtn = document.getElementById('feedbackNextBtn');
    var pageInfo = document.getElementById('feedbackPageInfo');

    if (!feedbackList) return;

    var allFeedback = [];
    var currentPage = 1;
    var pageSize = 20;

    // 加载反馈数据
    async function loadFeedback() {
        try {
            feedbackList.innerHTML = '<div style="text-align: center; padding: 60px 20px; color: var(--text-muted);"><i class="ri-loader-4-line" style="font-size: 32px; animation: spin 1s linear infinite;"></i><p style="margin-top: 12px;">加载中...</p></div>';

            allFeedback = await DataService.getFeedback();
            currentPage = 1;
            renderFeedback();
        } catch (error) {
            feedbackList.innerHTML = '<div style="text-align: center; padding: 60px 20px; color: var(--text-muted);"><i class="ri-error-warning-line" style="font-size: 32px; color: #ef4444;"></i><p style="margin-top: 12px;">加载失败: ' + error.message + '</p></div>';
        }
    }

    // 渲染反馈列表
    function renderFeedback() {
        if (allFeedback.length === 0) {
            feedbackList.innerHTML = '<div style="text-align: center; padding: 60px 20px; color: var(--text-muted);"><i class="ri-inbox-line" style="font-size: 32px;"></i><p style="margin-top: 12px;">暂无反馈</p></div>';
            // 隐藏分页控件
            document.getElementById('feedbackPagination').style.display = 'none';
            return;
        }

        // 有数据时显示分页控件
        document.getElementById('feedbackPagination').style.display = 'flex';

        var totalPages = Math.ceil(allFeedback.length / pageSize);
        var startIndex = (currentPage - 1) * pageSize;
        var endIndex = Math.min(startIndex + pageSize, allFeedback.length);
        var pageFeedback = allFeedback.slice(startIndex, endIndex);

        var html = '';
        pageFeedback.forEach(function(item) {
            var date = new Date(item.created_at);
            var dateStr = date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            var idShort = item.id.toString().substring(0, 8);

            html += '<div class="feedback-item">';
            html += '  <div class="feedback-meta">';
            html += '    <div class="feedback-time">';
            html += '      <i class="ri-time-line"></i>';
            html += '      <span>' + dateStr + '</span>';
            html += '    </div>';
            html += '    <span class="feedback-id">#' + idShort + '</span>';
            html += '  </div>';
            html += '  <div class="feedback-content">' + (item.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
            if (item.contact) {
                html += '  <div class="feedback-contact">';
                html += '    <i class="ri-user-line"></i>';
                html += '    <span>' + (item.contact || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
                html += '  </div>';
            }
            html += '</div>';
        });

        feedbackList.innerHTML = html;

        // 更新分页信息（简洁格式：1 / 5）
        pageInfo.textContent = currentPage + ' / ' + totalPages;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    }

    // 分页控制
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                renderFeedback();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            var totalPages = Math.ceil(allFeedback.length / pageSize);
            if (currentPage < totalPages) {
                currentPage++;
                renderFeedback();
            }
        });
    }

    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function() {
            pageSize = parseInt(this.value);
            currentPage = 1;
            renderFeedback();
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadFeedback();
        });
    }

    // Tab 切换时加载数据
    document.addEventListener('tabChange', function(e) {
        if (e.detail === 'feedback' && allFeedback.length === 0) {
            loadFeedback();
        }
    });

    
})();
