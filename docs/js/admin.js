// 博客管理系统

(function() {
    console.log('[Admin] 管理系统初始化...');

    // Supabase配置
    var SUPABASE_URL = "https://jqsmoygkbqukgnwzkxvq.supabase.co";
    var SUPABASE_KEY = "sb_publishable_qyuLpuVm3ERyFaef0rq7uw_fJX2zAAM";
    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Quill编辑器初始化
    var quill = new Quill('#editor', {
        theme: 'snow',
        placeholder: '开始写作...',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                ['link', 'image', 'video'],
                ['clean']
            ]
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
    var adminEmail = document.getElementById('adminEmail');
    var postForm = document.getElementById('postForm');
    var resetBtn = document.getElementById('resetBtn');
    var postsList = document.getElementById('postsList');

    var currentUser = null;
    var isEditMode = false;

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

    // 更新UI
    function updateUIForLogin() {
        adminEmail.textContent = currentUser.email;
        logoutBtn.style.display = 'block';
        document.body.classList.add('is-admin');
    }

    function updateUIForLogout() {
        adminEmail.textContent = '未登录';
        logoutBtn.style.display = 'none';
        document.body.classList.remove('is-admin');
        window.location.href = './index.html';
    }

    // 检查登录状态
    async function checkAuth() {
        try {
            var { data: { session } } = await supabase.auth.getSession();

            if (session) {
                currentUser = session.user;
                updateUIForLogin();
            } else {
                showLoginModal();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            showLoginModal();
        }
    }

    // 重置表单
    resetBtn.addEventListener('click', function() {
        if (!confirm('确定要重置表单吗？')) return;
        resetForm();
    });

    function resetForm() {
        document.getElementById('postTitle').value = '';
        document.getElementById('postCategory').value = '';
        document.getElementById('postExcerpt').value = '';
        document.getElementById('postCover').value = '';
        document.getElementById('postId').value = '';
        quill.setContents([]);
        isEditMode = false;
        postForm.querySelector('.btn-primary').innerHTML = '<i class="ri-send-plane-fill"></i> 发布文章';
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

        var postData = {
            title: title,
            category: category,
            excerpt: excerpt,
            cover: cover || null,
            content: content,
            published: true,
            updated_at: new Date().toISOString()
        };

        try {
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
            Toast.error('操作失败：' + error.message);
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
                return;
            }

            var html = '';
            posts.forEach(function(post) {
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

        } catch (error) {
            console.error('Load posts error:', error);
            postsList.innerHTML = '<div class="empty-state"><i class="ri-error-warning-line"></i><p>加载失败：' + error.message + '</p></div>';
        }
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

    // 页面加载时检查登录状态
    checkAuth();

    console.log('[Admin] 管理系统初始化完成');
})();
