// 博客管理系统

(function() {
    console.log('[Admin] 管理系统初始化...');

    // 使用全局共享的 Supabase 客户端（如果存在），否则创建新的
    var supabase;

    if (window.blogSupabaseClient) {
        // 使用已存在的客户端实例
        supabase = window.blogSupabaseClient;
        console.log('[Admin] 使用共享的 Supabase 客户端');
    } else {
        // 创建新的客户端实例
        var SUPABASE_URL = "https://jqsmoygkbqukgnwzkxvq.supabase.co";
        var SUPABASE_KEY = "sb_publishable_qyuLpuVm3ERyFaef0rq7uw_fJX2zAAM";
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false
            }
        });
        // 保存到全局以供复用
        window.blogSupabaseClient = supabase;
        console.log('[Admin] 创建新的 Supabase 客户端');
    }

    // 注册 ImageResize 模块
    Quill.register('modules/imageResize', window.ImageResize.default);

    // Quill编辑器初始化
    var quill = new Quill('#editor', {
        theme: 'snow',
        placeholder: '开始写作...',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                ['link', 'image', 'video'],
                ['clean']
            ],
            imageResize: {
                displayStyles: {
                    backgroundColor: 'black',
                    border: 'none',
                    color: 'white'
                },
                modules: ['Resize', 'DisplaySize', 'Toolbar']
            }
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

    var currentUser = null;
    var isEditMode = false;
    var allPosts = []; // 存储所有文章用于筛选
    var currentFilter = 'all'; // 当前选中的筛选分类

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

            if (targetTab === 'list') {
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
            console.error('Login error:', error);
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
            console.error('Logout error:', error);
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
            console.log('[Admin] 检查登录状态...');

            var { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('[Admin] Session Error:', error);
                throw error;
            }

            console.log('[Admin] Session:', session ? '已登录 (' + session.user.email + ')' : '未登录');

            if (session && session.user) {
                currentUser = session.user;
                updateUIForLogin();
                console.log('[Admin] UI已更新为登录状态');
            } else {
                console.log('[Admin] 未检测到登录状态，显示重新登录按钮');
                updateUIForLogout(); // 显示重新登录按钮
            }
        } catch (error) {
            console.error('[Admin] Auth check error:', error);
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

            console.log('[Admin] 上传图片:', filename);

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

            console.log('[Admin] 图片上传成功:', urlData.publicUrl);
            return urlData.publicUrl;
        } catch (error) {
            console.error('[Admin] 图片上传失败:', error);
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

        if (!title || !category) {
            Toast.error('请填写标题和分类');
            return;
        }

        if (!content || content === '<p><br></p>') {
            Toast.error('请填写文章内容');
            return;
        }

        // 如果没有填写摘要，自动截取正文前200字
        if (!excerpt) {
            var textContent = quill.getText().trim();
            excerpt = textContent.substring(0, 200) + (textContent.length > 200 ? '...' : '');
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
                updated_at: new Date().toISOString()
            };

            if (isEditMode && postId) {
                // 更新文章
                var { error } = await supabase
                    .from('blog_posts')
                    .update(postData)
                    .eq('id', postId);

                if (error) throw error;
                Toast.success('文章更新成功！');
            } else {
                // 新建文章
                postData.created_at = new Date().toISOString();
                var { error } = await supabase
                    .from('blog_posts')
                    .insert([postData]);

                if (error) throw error;
                Toast.success('文章发布成功！');
            }

            resetForm();

            // 切换到列表标签
            document.querySelector('[data-tab="list"]').click();
        } catch (error) {
            console.error('Save post error:', error);
            if (error.message && error.message.includes('storage')) {
                Toast.error('封面图上传失败：' + error.message);
            } else {
                Toast.error('操作失败：' + error.message);
            }
        }
    });

    // 加载文章列表
    async function loadPostsList() {
        postsList.innerHTML = '<div class="loading"><i class="ri-loader-4-line" style="animation: spin 1s linear infinite;"></i> 加载中...</div>';

        try {
            var { data: posts, error } = await supabase
                .from('blog_posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

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
            console.error('Load posts error:', error);
            postsList.innerHTML = '<div class="empty-state"><i class="ri-error-warning-line"></i><p>加载失败：' + error.message + '</p></div>';
        }
    }

    // 更新分类计数
    function updateCategoryCounts(posts) {
        var counts = {
            all: posts.length || 0,
            diary: 0,
            experience: 0,
            work: 0,
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
        document.getElementById('count-work').textContent = counts.work;
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
                'work': '职场碎碎念',
                'notes': '随手记录'
            };

            var createdDate = new Date(post.created_at).toLocaleDateString('zh-CN');

            html += '<div class="post-item">';
            html += '  <div class="post-info">';
            html += '    <div class="post-title">' + escapeHtml(post.title) + '</div>';
            html += '    <div class="post-meta">';
            html += '      <span><i class="ri-folder-line"></i> ' + (categoryNames[post.category] || post.category) + '</span>';
            html += '      <span><i class="ri-calendar-line"></i> ' + createdDate + '</span>';
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
            console.error('Load post error:', error);
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
            console.error('Delete post error:', error);
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
            console.log('[Admin] 编辑模式，文章ID:', editPostId);

            // 切换到编辑标签
            tabs.forEach(function(t) { t.classList.remove('active'); });
            panels.forEach(function(p) { p.classList.remove('active'); });

            document.querySelector('[data-tab="editor"]').classList.add('active');
            document.getElementById('panel-editor').classList.add('active');

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
                    document.getElementById('postPublished').checked = post.published || false;

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
                    console.log('[Admin] 文章加载成功');
                    Toast.success('文章加载成功，可以开始编辑');
                }
            } catch (error) {
                console.error('[Admin] 加载文章失败:', error);
                Toast.error('加载文章失败: ' + error.message);
            }
        }
    }

    // 页面加载时检查登录状态
    checkAuth().then(function() {
        // 登录成功后检查是否需要加载文章
        checkEditMode();
    });

    // 初始化筛选按钮
    initFilterButtons();

    console.log('[Admin] 管理系统初始化完成');
})();
