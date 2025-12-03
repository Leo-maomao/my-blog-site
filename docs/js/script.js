// 毛毛的博客站 - 核心脚本
// 数据服务：封装 Supabase 逻辑（文章存储）
var DataService = (function() {
    var SUPABASE_URL = "https://jqsmoygkbqukgnwzkxvq.supabase.co";
    var SUPABASE_KEY = "sb_publishable_qyuLpuVm3ERyFaef0rq7uw_fJX2zAAM";

    var supabase = null;
    var useLocalFallback = false;

    try {
        if (window.supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log("[Blog] Supabase initialized");
        } else {
            console.error("[Blog] Supabase SDK not loaded");
            useLocalFallback = true;
        }
    } catch (e) {
        console.error("[Blog] Supabase Init Error:", e);
        useLocalFallback = true;
    }

    // 表名和键名（与 nav 项目区分）
    var BLOG_POSTS_TABLE = "blog_posts";      // 博客文章表
    var BLOG_CONFIG_KEY = "blog_config";      // 博客配置
    var LOCAL_POSTS_KEY = "blog_posts_local_v1";
    var LOCAL_CONFIG_KEY = "blog_config_local_v1";

    // Helper: 检查连接
    async function checkConnection() {
        if (useLocalFallback) return false;
        try {
            var { data, error } = await supabase.from('config').select('key').limit(1);
            if (error) throw error;
            return true;
        } catch (e) {
            console.warn("[Blog] Supabase Connection Failed (using fallback):", e.message);
            useLocalFallback = true;
            return false;
        }
    }

    // --- 文章相关方法 ---

    // 获取所有文章列表
    async function getAllPosts() {
        if (useLocalFallback) {
            return JSON.parse(localStorage.getItem(LOCAL_POSTS_KEY) || "[]");
        }

        try {
            var { data, error } = await supabase
                .from(BLOG_POSTS_TABLE)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error("[Blog] Get Posts Error:", e);
            return JSON.parse(localStorage.getItem(LOCAL_POSTS_KEY) || "[]");
        }
    }

    // 根据分类获取文章
    async function getPostsByCategory(category) {
        if (useLocalFallback) {
            var allPosts = JSON.parse(localStorage.getItem(LOCAL_POSTS_KEY) || "[]");
            return allPosts.filter(function(post) { return post.category === category; });
        }

        try {
            var { data, error } = await supabase
                .from(BLOG_POSTS_TABLE)
                .select('*')
                .eq('category', category)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error("[Blog] Get Posts By Category Error:", e);
            return [];
        }
    }

    // 保存文章（管理员功能，未来扩展）
    async function savePost(postData) {
        if (useLocalFallback) {
            var posts = JSON.parse(localStorage.getItem(LOCAL_POSTS_KEY) || "[]");
            postData.id = Date.now();
            postData.created_at = new Date().toISOString();
            posts.unshift(postData);
            localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
            return { success: true, data: postData };
        }

        try {
            var { data, error } = await supabase
                .from(BLOG_POSTS_TABLE)
                .insert([postData])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (e) {
            console.error("[Blog] Save Post Error:", e);
            return { success: false, error: e.message };
        }
    }

    // --- 配置相关方法 ---

    async function loadConfig() {
        if (useLocalFallback) {
            return JSON.parse(localStorage.getItem(LOCAL_CONFIG_KEY) || "{}");
        }

        try {
            var { data, error } = await supabase
                .from('config')
                .select('value')
                .eq('key', BLOG_CONFIG_KEY)
                .single();

            if (error) throw error;
            return data ? data.value : {};
        } catch (e) {
            console.warn("[Blog] Load Config Error:", e);
            return JSON.parse(localStorage.getItem(LOCAL_CONFIG_KEY) || "{}");
        }
    }

    async function saveConfig(configData) {
        if (useLocalFallback) {
            localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(configData));
            return;
        }

        try {
            var { error } = await supabase
                .from('config')
                .upsert({
                    key: BLOG_CONFIG_KEY,
                    value: configData,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (e) {
            console.error("[Blog] Save Config Error:", e);
        }
    }

    // 暴露公共接口
    return {
        checkConnection: checkConnection,
        getAllPosts: getAllPosts,
        getPostsByCategory: getPostsByCategory,
        savePost: savePost,
        loadConfig: loadConfig,
        saveConfig: saveConfig,
        isLocalMode: function() { return useLocalFallback; }
    };
})();

// 导航栏自动隐藏逻辑（滚动时隐藏，向上滚动时显示）
(function() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    var lastScrollTop = 0;
    var scrollThreshold = 100; // 滚动超过100px才触发
    var isHeaderHidden = false;

    window.addEventListener('scroll', function() {
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // 在顶部时始终显示
        if (scrollTop < scrollThreshold) {
            if (isHeaderHidden) {
                header.classList.remove('is-hidden');
                isHeaderHidden = false;
            }
            return;
        }

        // 向下滚动：隐藏
        if (scrollTop > lastScrollTop && !isHeaderHidden) {
            header.classList.add('is-hidden');
            isHeaderHidden = true;
        }
        // 向上滚动：显示
        else if (scrollTop < lastScrollTop && isHeaderHidden) {
            header.classList.remove('is-hidden');
            isHeaderHidden = false;
        }

        lastScrollTop = scrollTop;
    }, { passive: true });
})();

// 返回顶部按钮
(function() {
    var backBtn = document.getElementById('backToTop');
    if (!backBtn) {
        // 如果页面没有返回顶部按钮，动态创建一个
        backBtn = document.createElement('button');
        backBtn.id = 'backToTop';
        backBtn.className = 'back-to-top';
        backBtn.setAttribute('aria-label', '回到顶部');
        backBtn.innerHTML = '<i class="ri-arrow-up-line"></i>';
        document.body.appendChild(backBtn);
    }

    // 显示/隐藏逻辑
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            backBtn.classList.add('is-visible');
        } else {
            backBtn.classList.remove('is-visible');
        }
    }, { passive: true });

    // 点击滚动到顶部
    backBtn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
})();

// 平滑滚动增强
(function() {
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            var href = this.getAttribute('href');
            if (href === '#' || href === '#top') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            var target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                var offsetTop = target.getBoundingClientRect().top + window.pageYOffset;
                var headerHeight = document.querySelector('.site-header')?.offsetHeight || 0;
                window.scrollTo({
                    top: offsetTop - headerHeight - 20,
                    behavior: 'smooth'
                });
            }
        });
    });
})();

// Toast 提示组件
var Toast = (function() {
    var toastContainer = null;

    // 初始化 Toast 容器
    function init() {
        if (toastContainer) return;

        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    /**
     * 显示 Toast 消息
     * @param {string} message - 消息内容
     * @param {string} type - 类型: 'success', 'error', 'warning', 'info'
     * @param {number} duration - 持续时间（毫秒），默认 3000
     */
    function show(message, type, duration) {
        init();

        type = type || 'info';
        duration = duration || 3000;

        var toast = document.createElement('div');
        toast.className = 'toast toast--' + type;

        var icon = '';
        switch(type) {
            case 'success': icon = 'ri-checkbox-circle-line'; break;
            case 'error': icon = 'ri-error-warning-line'; break;
            case 'warning': icon = 'ri-alert-line'; break;
            case 'info': icon = 'ri-information-line'; break;
        }

        toast.innerHTML = '<i class="' + icon + '"></i><span>' + message + '</span>';
        toastContainer.appendChild(toast);

        // 触发动画
        setTimeout(function() {
            toast.classList.add('toast--visible');
        }, 10);

        // 自动移除
        setTimeout(function() {
            toast.classList.remove('toast--visible');
            setTimeout(function() {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    return {
        success: function(msg, duration) { show(msg, 'success', duration); },
        error: function(msg, duration) { show(msg, 'error', duration); },
        warning: function(msg, duration) { show(msg, 'warning', duration); },
        info: function(msg, duration) { show(msg, 'info', duration); }
    };
})();

// 移动端菜单功能
(function() {
    var toggle = document.getElementById('mobileMenuToggle');
    var menu = document.getElementById('mobileMenu');

    // 如果页面没有移动端菜单，创建一个
    if (toggle && !menu) {
        menu = document.createElement('div');
        menu.id = 'mobileMenu';
        menu.className = 'mobile-menu';

        // 获取导航链接
        var navLinks = document.querySelectorAll('.nav-links .nav-link');
        navLinks.forEach(function(link) {
            var mobileLink = document.createElement('a');
            mobileLink.href = link.href;
            mobileLink.className = 'mobile-menu-link';
            if (link.classList.contains('is-active')) {
                mobileLink.classList.add('is-active');
            }
            mobileLink.textContent = link.textContent;
            menu.appendChild(mobileLink);
        });

        // 插入到 header 后面
        var header = document.querySelector('.site-header');
        if (header && header.parentNode) {
            header.parentNode.insertBefore(menu, header.nextSibling);
        }
    }

    if (toggle && menu) {
        toggle.addEventListener('click', function() {
            menu.classList.toggle('active');
            toggle.classList.toggle('is-active');
        });

        // 点击菜单项后关闭
        menu.querySelectorAll('.mobile-menu-link').forEach(function(link) {
            link.addEventListener('click', function() {
                menu.classList.remove('active');
                toggle.classList.remove('is-active');
            });
        });

        // 点击页面其他地方关闭菜单
        document.addEventListener('click', function(e) {
            if (!toggle.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.remove('active');
                toggle.classList.remove('is-active');
            }
        });
    }
})();

// 图片懒加载（性能优化）
(function() {
    // 检查浏览器是否支持 IntersectionObserver
    if ('IntersectionObserver' in window) {
        var lazyImages = document.querySelectorAll('img[data-src]');

        var imageObserver = new IntersectionObserver(function(entries, observer) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    var img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });

        lazyImages.forEach(function(img) {
            imageObserver.observe(img);
        });
    } else {
        // 降级方案：直接加载所有图片
        var lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(function(img) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }
})();

// 页面加载完成提示
console.log('[Blog] 脚本加载完成 ✓');
console.log('[Blog] 数据模式:', DataService.isLocalMode() ? '本地存储' : 'Supabase云端');

// 显示数据模式提示（Toast）- 已暂时隐藏
// setTimeout(function() {
//     if (DataService.isLocalMode()) {
//         Toast.warning('Supabase 连接失败，已切换到本地存储模式', 4000);
//     } else {
//         Toast.success('数据加载完成', 2000);
//     }
// }, 1000);

// 管理员登录系统 (Ctrl/Cmd + Shift + K)
(function() {
    var SUPABASE_URL = "https://jqsmoygkbqukgnwzkxvq.supabase.co";
    var SUPABASE_KEY = "sb_publishable_qyuLpuVm3ERyFaef0rq7uw_fJX2zAAM";

    if (!window.supabase) {
        console.warn('[Blog] Supabase SDK未加载，管理员功能不可用');
        return;
    }

    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // 创建登录模态框（如果不存在）
    if (!document.getElementById('adminLoginModal')) {
        var modalHTML = '<div id="adminLoginModal" class="modal-overlay">' +
            '<div class="modal-box" style="max-width: 400px;">' +
            '<div class="modal-header">' +
            '<h3>管理员登录</h3>' +
            '<i class="ri-close-line modal-close" id="adminLoginClose"></i>' +
            '</div>' +
            '<div class="modal-body">' +
            '<div class="modal-input-group">' +
            '<label>邮箱</label>' +
            '<input id="adminLoginEmail" class="modal-input" placeholder="请输入管理员邮箱" type="email" />' +
            '</div>' +
            '<div class="modal-input-group">' +
            '<label>密码</label>' +
            '<input id="adminLoginPassword" class="modal-input" placeholder="请输入密码" type="password" />' +
            '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="modal-btn cancel" id="adminLoginCancel">取消</button>' +
            '<button class="modal-btn confirm" id="adminLoginSubmit">登录</button>' +
            '</div>' +
            '</div>' +
            '</div>';
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    var loginModal = document.getElementById('adminLoginModal');
    var emailInput = document.getElementById('adminLoginEmail');
    var passwordInput = document.getElementById('adminLoginPassword');
    var submitBtn = document.getElementById('adminLoginSubmit');
    var cancelBtn = document.getElementById('adminLoginCancel');
    var closeBtn = document.getElementById('adminLoginClose');

    // 关闭模态框
    function closeLoginModal() {
        loginModal.classList.remove('is-visible');
        emailInput.value = '';
        passwordInput.value = '';
    }

    closeBtn.addEventListener('click', closeLoginModal);
    cancelBtn.addEventListener('click', closeLoginModal);

    // 显示管理入口
    function showAdminLink() {
        var navLinks = document.querySelector('.nav-links');
        if (!navLinks || document.getElementById('adminNavLink')) return;

        var adminLink = document.createElement('a');
        adminLink.href = './admin.html';
        adminLink.className = 'nav-link';
        adminLink.id = 'adminNavLink';
        adminLink.innerHTML = '<i class="ri-settings-3-line"></i> 管理';
        adminLink.style.color = '#10b981'; // 绿色标识
        navLinks.appendChild(adminLink);

        document.body.classList.add('is-admin');
        console.log('[Blog] 管理员模式已激活');
    }

    // 隐藏管理入口
    function hideAdminLink() {
        var adminLink = document.getElementById('adminNavLink');
        if (adminLink) {
            adminLink.remove();
        }
        document.body.classList.remove('is-admin');
    }

    // 登录处理
    submitBtn.addEventListener('click', async function() {
        var email = emailInput.value.trim();
        var password = passwordInput.value.trim();

        if (!email || !password) {
            Toast.error('请输入邮箱和密码');
            return;
        }

        // 显示加载状态
        submitBtn.disabled = true;
        submitBtn.textContent = '登录中...';

        try {
            console.log('[Blog] 尝试登录:', email);

            var { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.error('[Blog] 登录错误:', error);
                throw error;
            }

            console.log('[Blog] 登录成功:', data);

            closeLoginModal();
            showAdminLink();
            Toast.success('登录成功！管理入口已显示');
        } catch (error) {
            console.error('[Blog] Login error:', error);

            var errorMsg = '登录失败';
            if (error.message.includes('Invalid login credentials')) {
                errorMsg = '邮箱或密码错误，请检查';
            } else if (error.message.includes('Email not confirmed')) {
                errorMsg = '邮箱未验证，请在Supabase中确认用户';
            } else {
                errorMsg = '登录失败：' + error.message;
            }

            Toast.error(errorMsg);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '登录';
        }
    });

    // Enter键登录
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitBtn.click();
        }
    });

    // 快捷键处理
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            console.log('[Blog] 管理员快捷键触发');

            // 检查是否已登录
            supabase.auth.getSession().then(function(result) {
                if (result.data.session) {
                    // 已登录，直接跳转到管理页面
                    window.location.href = './admin.html';
                } else {
                    // 未登录，显示登录框
                    loginModal.classList.add('is-visible');
                    setTimeout(function() {
                        emailInput.focus();
                    }, 100);
                }
            });
        }
    });

    // 页面加载时检查登录状态
    supabase.auth.getSession().then(function(result) {
        if (result.data.session) {
            showAdminLink();
        }
    });

    // 监听登录状态变化
    supabase.auth.onAuthStateChange(function(event, session) {
        if (event === 'SIGNED_OUT') {
            hideAdminLink();
            Toast.info('已退出管理员模式');
        }
    });

    console.log('[Blog] 管理员系统已激活 (Ctrl/Cmd + Shift + K)');
})();
