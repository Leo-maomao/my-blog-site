/**
 * 毛毛的博客站 - 核心脚本 V2
 * 规范来源：rules/03-development/code-standards/javascript.md
 */

// ============================================
// 数据服务：封装 Supabase 逻辑（文章存储）
// ============================================
const DataService = (function() {
    'use strict';

    // TODO: 替换为你自己的 Supabase 项目配置
    const SUPABASE_URL = 'https://your-project-id.supabase.co';
    const SUPABASE_KEY = 'your-supabase-anon-key';

    let supabase = null;
    let useLocalFallback = false;

    try {
        if (window.supabase) {
            // 使用全局共享的 Supabase 客户端，避免创建多个实例
            if (window.blogSupabaseClient) {
                supabase = window.blogSupabaseClient;
            } else {
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
        } else {
            useLocalFallback = true;
        }
    } catch (e) {
        useLocalFallback = true;
    }

    // 表名和键名（与 nav 项目区分）
    const BLOG_POSTS_TABLE = 'blog_posts';
    const BLOG_CONFIG_KEY = 'blog_config';
    const FEEDBACK_TABLE = 'blog_feedback';
    const LOCAL_POSTS_KEY = 'blog_posts_local_v1';
    const LOCAL_CONFIG_KEY = 'blog_config_local_v1';
    const LOCAL_FEEDBACK_KEY = 'blog_feedback_local_v1';

    // Helper: 检查连接
    async function checkConnection() {
        if (useLocalFallback) return false;
        try {
            const { error } = await supabase.from('config').select('key').limit(1);
            if (error) throw error;
            return true;
        } catch (e) {
            useLocalFallback = true;
            return false;
        }
    }

    // --- 文章相关方法 ---

    async function getAllPosts() {
        if (useLocalFallback) {
            return JSON.parse(localStorage.getItem(LOCAL_POSTS_KEY) || '[]');
        }

        try {
            const { data, error } = await supabase
                .from(BLOG_POSTS_TABLE)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (e) {
            return JSON.parse(localStorage.getItem(LOCAL_POSTS_KEY) || '[]');
        }
    }

    async function getPostsByCategory(category) {
        if (useLocalFallback) {
            const allPosts = JSON.parse(localStorage.getItem(LOCAL_POSTS_KEY) || '[]');
            return allPosts.filter(function(post) { return post.category === category; });
        }

        try {
            const { data, error } = await supabase
                .from(BLOG_POSTS_TABLE)
                .select('*')
                .eq('category', category)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (e) {
            return [];
        }
    }

    async function savePost(postData) {
        if (useLocalFallback) {
            const posts = JSON.parse(localStorage.getItem(LOCAL_POSTS_KEY) || '[]');
            postData.id = Date.now();
            postData.created_at = new Date().toISOString();
            posts.unshift(postData);
            localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
            return { success: true, data: postData };
        }

        try {
            const { data, error } = await supabase
                .from(BLOG_POSTS_TABLE)
                .insert([postData])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // --- 配置相关方法 ---

    async function loadConfig() {
        if (useLocalFallback) {
            return JSON.parse(localStorage.getItem(LOCAL_CONFIG_KEY) || '{}');
        }

        try {
            const { data, error } = await supabase
                .from('config')
                .select('value')
                .eq('key', BLOG_CONFIG_KEY)
                .single();

            if (error) throw error;
            return data ? data.value : {};
        } catch (e) {
            return JSON.parse(localStorage.getItem(LOCAL_CONFIG_KEY) || '{}');
        }
    }

    async function saveConfig(configData) {
        if (useLocalFallback) {
            localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(configData));
            return;
        }

        try {
            const { error } = await supabase
                .from('config')
                .upsert({
                    key: BLOG_CONFIG_KEY,
                    value: configData,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (e) {
            // Config save failed silently
        }
    }

    // --- 意见反馈相关方法 ---

    async function submitFeedback(content, contact) {
        if (useLocalFallback) {
            const list = JSON.parse(localStorage.getItem(LOCAL_FEEDBACK_KEY) || '[]');
            list.unshift({
                id: Date.now(),
                content: content,
                contact: contact || '无联系方式',
                created_at: new Date().toISOString()
            });
            localStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(list));
            return { success: true };
        }

        try {
            const { error } = await supabase
                .from(FEEDBACK_TABLE)
                .insert([{ content: content, contact: contact }]);

            if (error) throw error;
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async function getFeedback() {
        if (useLocalFallback) {
            return JSON.parse(localStorage.getItem(LOCAL_FEEDBACK_KEY) || '[]');
        }

        try {
            const { data, error } = await supabase
                .from(FEEDBACK_TABLE)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (e) {
            return [];
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
        submitFeedback: submitFeedback,
        getFeedback: getFeedback,
        isLocalMode: function() { return useLocalFallback; }
    };
})();

// ============================================
// 导航栏自动隐藏逻辑
// ============================================
(function() {
    'use strict';

    const header = document.querySelector('.site-header');
    if (!header) return;

    let lastScrollTop = 0;
    const scrollThreshold = 100;
    let isHeaderHidden = false;

    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

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

// ============================================
// 返回顶部按钮
// ============================================
(function() {
    'use strict';

    let backBtn = document.getElementById('backToTop');
    if (!backBtn) {
        backBtn = document.createElement('button');
        backBtn.id = 'backToTop';
        backBtn.className = 'back-to-top';
        backBtn.setAttribute('aria-label', '回到顶部');
        backBtn.innerHTML = '<i class="ri-arrow-up-line"></i>';
        document.body.appendChild(backBtn);
    }

    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            backBtn.classList.add('is-visible');
        } else {
            backBtn.classList.remove('is-visible');
        }
    }, { passive: true });

    backBtn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
})();

// ============================================
// 平滑滚动增强
// ============================================
(function() {
    'use strict';

    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '#top') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const offsetTop = target.getBoundingClientRect().top + window.pageYOffset;
                const headerHeight = document.querySelector('.site-header')?.offsetHeight || 0;
                window.scrollTo({
                    top: offsetTop - headerHeight - 20,
                    behavior: 'smooth'
                });
            }
        });
    });
})();

// ============================================
// Toast 提示组件
// ============================================
const Toast = (function() {
    'use strict';

    let toastContainer = null;

    function init() {
        if (toastContainer) return;

        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        toastContainer.setAttribute('role', 'alert');
        toastContainer.setAttribute('aria-live', 'polite');
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

        const toast = document.createElement('div');
        toast.className = 'toast toast--' + type;
        toast.setAttribute('role', 'status');

        const iconMap = {
            success: 'ri-checkbox-circle-line',
            error: 'ri-error-warning-line',
            warning: 'ri-alert-line',
            info: 'ri-information-line'
        };

        toast.innerHTML = '<i class="' + iconMap[type] + '" aria-hidden="true"></i><span>' + message + '</span>';
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

// ============================================
// 移动端菜单功能
// ============================================
(function() {
    'use strict';

    const toggle = document.getElementById('mobileMenuToggle');
    let menu = document.getElementById('mobileMenu');

    // 如果页面没有移动端菜单，创建一个
    if (toggle && !menu) {
        menu = document.createElement('nav');
        menu.id = 'mobileMenu';
        menu.className = 'mobile-menu';
        menu.setAttribute('aria-label', '移动端导航');

        const navLinks = document.querySelectorAll('.nav-links .nav-link');
        navLinks.forEach(function(link) {
            const mobileLink = document.createElement('a');
            mobileLink.href = link.href;
            mobileLink.className = 'mobile-menu-link';
            if (link.classList.contains('is-active')) {
                mobileLink.classList.add('is-active');
            }
            mobileLink.textContent = link.textContent;
            menu.appendChild(mobileLink);
        });

        const header = document.querySelector('.site-header');
        if (header && header.parentNode) {
            header.parentNode.insertBefore(menu, header.nextSibling);
        }
    }

    if (toggle && menu) {
        toggle.addEventListener('click', function() {
            const isExpanded = menu.classList.toggle('active');
            toggle.classList.toggle('is-active');
            toggle.setAttribute('aria-expanded', isExpanded);
        });

        menu.querySelectorAll('.mobile-menu-link').forEach(function(link) {
            link.addEventListener('click', function() {
                menu.classList.remove('active');
                toggle.classList.remove('is-active');
                toggle.setAttribute('aria-expanded', 'false');
            });
        });

        document.addEventListener('click', function(e) {
            if (!toggle.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.remove('active');
                toggle.classList.remove('is-active');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
})();

// ============================================
// 图片懒加载（性能优化）
// ============================================
(function() {
    'use strict';

    if ('IntersectionObserver' in window) {
        const lazyImages = document.querySelectorAll('img[data-src]');

        const imageObserver = new IntersectionObserver(function(entries, observer) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    const img = entry.target;
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
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(function(img) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }
})();

// ============================================
// 管理员登录系统 (Ctrl/Cmd + Shift + K)
// ============================================
(function() {
    'use strict';

    // TODO: 替换为你自己的 Supabase 项目配置
    const SUPABASE_URL = 'https://your-project-id.supabase.co';
    const SUPABASE_KEY = 'your-supabase-anon-key';

    if (!window.supabase) {
        return;
    }

    // 使用全局共享的 Supabase 客户端
    let supabase;
    if (window.blogSupabaseClient) {
        supabase = window.blogSupabaseClient;
    } else {
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

    // 创建登录模态框（如果不存在）
    if (!document.getElementById('adminLoginModal')) {
        const modalHTML = '<div id="adminLoginModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="adminLoginTitle">' +
            '<div class="modal-box" style="max-width: 400px;">' +
            '<div class="modal-header">' +
            '<h3 id="adminLoginTitle">管理员登录</h3>' +
            '<i class="ri-close-line modal-close" id="adminLoginClose" role="button" aria-label="关闭"></i>' +
            '</div>' +
            '<div class="modal-body">' +
            '<div class="modal-input-group">' +
            '<label for="adminLoginEmail">邮箱</label>' +
            '<input id="adminLoginEmail" class="modal-input" placeholder="请输入管理员邮箱" type="email" autocomplete="off" />' +
            '</div>' +
            '<div class="modal-input-group">' +
            '<label for="adminLoginPassword">密码</label>' +
            '<input id="adminLoginPassword" class="modal-input" placeholder="请输入密码" type="password" autocomplete="new-password" />' +
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

    const loginModal = document.getElementById('adminLoginModal');
    const emailInput = document.getElementById('adminLoginEmail');
    const passwordInput = document.getElementById('adminLoginPassword');
    const submitBtn = document.getElementById('adminLoginSubmit');
    const cancelBtn = document.getElementById('adminLoginCancel');
    const closeBtn = document.getElementById('adminLoginClose');

    function closeLoginModal() {
        loginModal.classList.remove('is-visible');
        emailInput.value = '';
        passwordInput.value = '';
    }

    closeBtn.addEventListener('click', closeLoginModal);
    cancelBtn.addEventListener('click', closeLoginModal);

    function showAdminLink() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks || document.getElementById('adminNavLink')) return;

        const adminLink = document.createElement('a');
        adminLink.href = './admin.html';
        adminLink.className = 'nav-link';
        adminLink.id = 'adminNavLink';
        adminLink.innerHTML = '<i class="ri-settings-3-line" aria-hidden="true"></i> 管理';
        adminLink.style.color = 'var(--color-success)';
        navLinks.appendChild(adminLink);

        document.body.classList.add('is-admin');
    }

    function hideAdminLink() {
        const adminLink = document.getElementById('adminNavLink');
        if (adminLink) {
            adminLink.remove();
        }
        document.body.classList.remove('is-admin');
    }

    submitBtn.addEventListener('click', async function() {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            Toast.error('请输入邮箱和密码');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '登录中...';

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw error;
            }

            closeLoginModal();
            showAdminLink();
            Toast.success('登录成功！管理入口已显示');
        } catch (error) {
            let errorMsg = '登录失败';
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

    // 回车键提交登录
    emailInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            passwordInput.focus();
        }
    });

    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitBtn.click();
        }
    });

    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();

            supabase.auth.getSession().then(function(result) {
                if (result.data.session) {
                    window.location.href = './admin.html';
                } else {
                    loginModal.classList.add('is-visible');
                    setTimeout(function() {
                        emailInput.focus();
                    }, 100);
                }
            });
        }
    });

    supabase.auth.getSession().then(function(result) {
        if (result.data.session) {
            showAdminLink();
        }
    });

    supabase.auth.onAuthStateChange(function(event) {
        if (event === 'SIGNED_OUT') {
            hideAdminLink();
            Toast.info('已退出管理员模式');
        }
    });
})();

// ============================================
// 意见反馈功能
// ============================================
(function() {
    'use strict';

    const feedbackBtn = document.getElementById('feedbackBtn');
    const modal = document.getElementById('feedbackModal');
    const close = document.getElementById('feedbackModalClose');
    const cancel = document.getElementById('feedbackCancelBtn');
    const submit = document.getElementById('feedbackSubmitBtn');
    const contentInput = document.getElementById('feedbackContent');
    const contactInput = document.getElementById('feedbackContact');

    if (!feedbackBtn || !modal) return;

    feedbackBtn.onclick = function() {
        modal.classList.add('is-visible');
        setTimeout(function() {
            if (contentInput) contentInput.focus();
        }, 100);
    };

    function closeModal() {
        modal.classList.remove('is-visible');
        setTimeout(function() {
            if (contentInput) contentInput.value = '';
            if (contactInput) contactInput.value = '';
        }, 200);
    }

    if (close) close.onclick = closeModal;
    if (cancel) cancel.onclick = closeModal;

    if (submit) submit.onclick = async function() {
        const content = contentInput.value.trim();
        if (!content) {
            Toast.error('请输入反馈内容');
            return;
        }

        submit.disabled = true;
        submit.textContent = '提交中...';

        try {
            const result = await DataService.submitFeedback(content, contactInput.value.trim());
            if (result.success) {
                Toast.success('反馈提交成功，感谢您的反馈！');
                closeModal();
            } else {
                Toast.error('提交失败：' + (result.error || '未知错误'));
            }
        } catch (e) {
            Toast.error('提交失败：' + e.message);
        } finally {
            submit.disabled = false;
            submit.textContent = '提交反馈';
        }
    };

    // 反馈按钮位置调整
    const backToTopBtn = document.getElementById('backToTop');
    const wechatQrFloat = document.getElementById('wechatQrFloat');
    const wechatQrBtn = document.getElementById('wechatQrBtn');

    if (backToTopBtn) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                feedbackBtn.classList.add('shift-up');
                if (wechatQrFloat) wechatQrFloat.classList.add('shift-up');
                if (wechatQrBtn) wechatQrBtn.classList.add('shift-up');
            } else {
                feedbackBtn.classList.remove('shift-up');
                if (wechatQrFloat) wechatQrFloat.classList.remove('shift-up');
                if (wechatQrBtn) wechatQrBtn.classList.remove('shift-up');
            }
        }, { passive: true });
    }
})();

// ============================================
// 51.la 埋点追踪模块
// ============================================

// 51.la Init（可选，如不需要可删除）
// TODO: 替换为你自己的 51.la 统计 ID
try {
    if (window.LA) {
        LA.init({ id: 'your-51la-id', ck: 'your-51la-id' });
    }
} catch (e) {
    // LA init failed silently
}

/**
 * 埋点工具函数
 * @param {string} eventName - 事件名称
 * @param {object} params - 事件参数
 */
function trackEvent(eventName, params) {
    try {
        if (window.LA && typeof LA.track === 'function') {
            LA.track(eventName, params || {});
        }
    } catch (e) {
        // 埋点失败不影响业务
    }
}

// 页面访问埋点 (page_view)
(function() {
    'use strict';

    let pageName = 'unknown';
    const path = window.location.pathname;

    const pageMap = {
        'index.html': 'index',
        'diary.html': 'diary',
        'experience.html': 'experience',
        'notes.html': 'notes',
        'post.html': 'post',
        'preview.html': 'preview',
        'admin.html': 'admin'
    };

    // 判断页面
    if (path === '/' || path === '') {
        pageName = 'index';
    } else {
        for (const [file, name] of Object.entries(pageMap)) {
            if (path.includes(file)) {
                pageName = name;
                break;
            }
        }
    }

    trackEvent('page_view', {
        page_name: pageName,
        page_url: path
    });
})();

// 顶部菜单点击埋点 (nav_menu_click)
(function() {
    'use strict';

    const navLinks = document.querySelectorAll('nav a, .nav a, [class*="nav"] a, header a');
    navLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            const menuName = this.textContent.trim();
            trackEvent('nav_menu_click', {
                menu_name: menuName
            });
        });
    });
})();

// ============================================
// 微信群二维码浮窗交互
// ============================================
(function() {
    'use strict';

    const wechatQrFloat = document.getElementById('wechatQrFloat');
    const wechatQrBtn = document.getElementById('wechatQrBtn');
    const wechatQrClose = document.getElementById('wechatQrClose');
    const wechatQrImage = document.getElementById('wechatQrImage');
    const wechatQrLoading = document.getElementById('wechatQrLoading');

    if (!wechatQrFloat || !wechatQrBtn || !wechatQrClose) return;

    async function loadWechatQrCode() {
        try {
            // TODO: 替换为你自己的 Supabase 项目配置
            const SUPABASE_URL = 'https://your-project-id.supabase.co';
            const SUPABASE_KEY = 'your-supabase-anon-key';

            if (!window.blogSupabaseClient && window.supabase) {
                window.blogSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
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
            }

            if (!window.blogSupabaseClient) {
                wechatQrFloat.style.display = 'none';
                return;
            }

            const result = await window.blogSupabaseClient
                .from('config')
                .select('value')
                .eq('key', 'wechat_qrcode_url')
                .single();

            if (result.data && result.data.value) {
                wechatQrImage.src = result.data.value;
                wechatQrImage.style.display = 'block';
                wechatQrLoading.style.display = 'none';
                wechatQrFloat.style.display = 'block';
            } else {
                wechatQrFloat.style.display = 'none';
            }
        } catch (e) {
            wechatQrFloat.style.display = 'none';
        }
    }

    // 延迟加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(loadWechatQrCode, 500);
        });
    } else {
        setTimeout(loadWechatQrCode, 500);
    }

    let hasClosedOnce = false;
    let hoverTimer = null;

    wechatQrClose.addEventListener('click', function() {
        hasClosedOnce = true;
        wechatQrFloat.style.display = 'none';
        wechatQrBtn.style.display = 'flex';
    });

    wechatQrBtn.addEventListener('click', function() {
        if (!hasClosedOnce) {
            wechatQrBtn.style.display = 'none';
            wechatQrFloat.style.display = 'block';
        }
    });

    wechatQrBtn.addEventListener('mouseenter', function() {
        if (hasClosedOnce) {
            clearTimeout(hoverTimer);
            wechatQrBtn.style.display = 'none';
            wechatQrFloat.style.display = 'block';
        }
    });

    wechatQrBtn.addEventListener('mouseleave', function() {
        if (hasClosedOnce) {
            hoverTimer = setTimeout(function() {
                wechatQrFloat.style.display = 'none';
                wechatQrBtn.style.display = 'flex';
            }, 200);
        }
    });

    wechatQrFloat.addEventListener('mouseenter', function() {
        if (hasClosedOnce) {
            clearTimeout(hoverTimer);
        }
    });

    wechatQrFloat.addEventListener('mouseleave', function() {
        if (hasClosedOnce) {
            wechatQrFloat.style.display = 'none';
            wechatQrBtn.style.display = 'flex';
        }
    });
})();
