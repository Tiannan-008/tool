// ============ 提取图片链接 ============
function extractImageLinks() {
    const links = [];
    const imgs = document.querySelectorAll('[class*="thumbnails"] img, [class*="thumbnail"] img');
    imgs.forEach(img => {
        let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
        if (src && src.startsWith('//')) src = 'https:' + src;
        if (src && !src.includes('s.gif') && !/icon/i.test(src)) {
            links.push(src);
        }
    });
    if (links.length === 0) {
        const mainImg = document.getElementById('mainPicImageEl');
        if (mainImg) {
            let src = mainImg.src || mainImg.getAttribute('data-src');
            if (src && src.startsWith('//')) src = 'https:' + src;
            if (src) links.push(src);
        }
    }
    return [...new Set(links)];
}

// ============ Toast 轻提示 ============
function showToast(msg, duration = 2000) {
    const existing = document.getElementById('tb-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'tb-toast';
    toast.textContent = msg;
    Object.assign(toast.style, {
        position: 'fixed',
        top: '60px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.8)',
        color: '#fff',
        padding: '12px 28px',
        borderRadius: '10px',
        fontSize: '16px',
        fontWeight: '500',
        zIndex: '999999999',
        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
        opacity: '0',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        pointerEvents: 'none'
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// ============ 复制图片到剪贴板 ============
async function copyImageToClipboard(url) {
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error('fetch failed');
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) throw new Error('not image');
        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
        showToast('✅ 图片已复制到剪贴板', 1500);
    } catch (err) {
        console.warn('复制图片失败，降级为复制链接', err);
        await navigator.clipboard.writeText(url);
        showToast('⚠️ 复制图片失败，已复制链接', 1800);
    }
}

// ============ 下载图片 ============
function downloadImages(urls) {
    urls.forEach((url, i) => {
        let ext = url.split('.').pop().split('?')[0] || 'jpg';
        if (ext.includes('_')) ext = ext.split('_')[0];
        if (!['jpg','jpeg','png','gif','webp','bmp'].includes(ext)) ext = 'jpg';
        const name = `image_${i+1}.${ext}`;
        chrome.downloads.download({ url, filename: name, saveAs: false });
    });
}

// ============ 创建主面板 ============
function createPanel() {
    if (document.getElementById('tb-image-downloader-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'tb-image-downloader-overlay';
    Object.assign(overlay.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.6)',
        zIndex: '99999999',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backdropFilter: 'blur(4px)',
        fontFamily: 'system-ui, sans-serif',
        padding: '20px',
        boxSizing: 'border-box'
    });

    const panel = document.createElement('div');
    panel.id = 'tb-image-downloader-panel';
    Object.assign(panel.style, {
        background: '#fff',
        borderRadius: '20px',
        width: '90%',
        maxWidth: '1200px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        boxSizing: 'border-box',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        position: 'relative'
    });

    // ----- 头部 -----
    const header = document.createElement('div');
    Object.assign(header.style, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '16px',
        borderBottom: '1px solid #eee',
        flexShrink: 0
    });
    const title = document.createElement('span');
    title.textContent = '📷 商品图片下载器';
    title.style.cssText = 'font-size:22px;font-weight:600;';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:transparent;border:none;font-size:28px;cursor:pointer;padding:0 8px;color:#555;transition:0.2s;';
    closeBtn.onmouseenter = () => closeBtn.style.color = '#ff5000';
    closeBtn.onmouseleave = () => closeBtn.style.color = '#555';
    closeBtn.onclick = () => overlay.remove();
    header.append(title, closeBtn);

    // ----- 工具栏（柔和色） -----
    const toolbar = document.createElement('div');
    Object.assign(toolbar.style, {
        display: 'flex',
        gap: '12px',
        padding: '16px 0',
        flexWrap: 'wrap',
        borderBottom: '1px solid #eee',
        flexShrink: 0
    });

    function darken(hex, percent) {
        let r = parseInt(hex.slice(1,3),16);
        let g = parseInt(hex.slice(3,5),16);
        let b = parseInt(hex.slice(5,7),16);
        r = Math.max(0, r - percent);
        g = Math.max(0, g - percent);
        b = Math.max(0, b - percent);
        return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
    }

    const createBtn = (text, onClick, color = '#ff8a5c') => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            padding: 8px 20px;
            background-color: ${color};
            color: #fff;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background-color 0.2s;
            letter-spacing: 0.3px;
        `;
        btn.onmouseenter = () => { btn.style.backgroundColor = darken(color, 15); };
        btn.onmouseleave = () => { btn.style.backgroundColor = color; };
        btn.onclick = onClick;
        return btn;
    };

    const baseColor = '#ff8a5c';
    const selectAllBtn = createBtn('全选', () => {
        document.querySelectorAll('.image-card').forEach(c => c.dataset.selected = 'true');
        updateSelectionUI();
    }, baseColor);
    const deselectAllBtn = createBtn('取消全选', () => {
        document.querySelectorAll('.image-card').forEach(c => c.dataset.selected = 'false');
        updateSelectionUI();
    }, baseColor);
    const copyLinksBtn = createBtn('复制链接', () => {
        const selected = getSelectedUrls();
        if (selected.length === 0) {
            showToast('⚠️ 请至少选择一张图片后复制', 1800);
            return;
        }
        navigator.clipboard.writeText(selected.join('\n'));
        showToast(`✅ 已复制 ${selected.length} 个链接`, 1500);
    }, baseColor);
    const downloadSelectedBtn = createBtn('下载选中', () => {
        const selected = getSelectedUrls();
        if (selected.length === 0) {
            showToast('⚠️ 请至少选择一张图片下载', 1800);
            return;
        }
        showToast(`⏳ 正在下载 ${selected.length} 张...`, 1200);
        downloadImages(selected);
    }, baseColor);
    const downloadAllBtn = createBtn('全部下载', () => {
        const all = document.querySelectorAll('.image-card');
        const urls = Array.from(all).map(c => c.dataset.url);
        if (!urls.length) return;
        showToast(`⏳ 正在下载 ${urls.length} 张...`, 1200);
        downloadImages(urls);
    }, baseColor);
    const refreshBtn = createBtn('🔄 刷新', () => {
        loadImages();
    }, '#7f8c8d');

    toolbar.append(selectAllBtn, deselectAllBtn, copyLinksBtn, downloadSelectedBtn, downloadAllBtn, refreshBtn);

    // ----- 图片网格 -----
    const gridContainer = document.createElement('div');
    gridContainer.id = 'image-grid';
    Object.assign(gridContainer.style, {
        flex: 1,
        overflowY: 'auto',
        padding: '16px 0',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '20px',
        alignContent: 'start'
    });

    function getSelectedUrls() {
        const cards = document.querySelectorAll('.image-card[data-selected="true"]');
        return Array.from(cards).map(c => c.dataset.url);
    }

    function updateSelectionUI() {
        document.querySelectorAll('.image-card').forEach(card => {
            const isSelected = card.dataset.selected === 'true';
            const wrapper = card.querySelector('.image-wrapper');
            wrapper.style.outline = isSelected ? '4px solid #2196F3' : 'none';
            wrapper.style.outlineOffset = '-2px';
            wrapper.style.boxShadow = isSelected ? '0 0 0 4px rgba(33,150,243,0.3)' : 'none';
        });
    }

    function loadImages() {
        const links = extractImageLinks();
        gridContainer.innerHTML = '';
        if (links.length === 0) {
            gridContainer.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;color:#999;padding:60px;">
                    <div style="font-size:48px;margin-bottom:16px;">🖼️</div>
                    <div>未找到图片</div>
                    <div style="font-size:14px;margin-top:8px;">请确认页面已完全加载后点击“刷新”</div>
                </div>
            `;
            return;
        }

        links.forEach((url, index) => {
            const card = document.createElement('div');
            card.className = 'image-card';
            card.dataset.url = url;
            card.dataset.selected = 'false';
            Object.assign(card.style, {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: '#f8f9fa',
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.2s',
                cursor: 'pointer'
            });

            const wrapper = document.createElement('div');
            wrapper.className = 'image-wrapper';
            Object.assign(wrapper.style, {
                width: '100%',
                aspectRatio: '1',
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative',
                transition: 'outline 0.15s, box-shadow 0.15s'
            });

            const img = document.createElement('img');
            img.src = url;
            img.loading = 'lazy';
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
            img.onerror = () => { img.src = ''; img.style.background = '#e9ecef'; };
            wrapper.appendChild(img);
            card.appendChild(wrapper);

            card.addEventListener('click', (e) => {
                if (e.target.closest('.action-btn')) return;
                const current = card.dataset.selected === 'true';
                card.dataset.selected = current ? 'false' : 'true';
                updateSelectionUI();
            });

            card.addEventListener('mouseenter', () => {
                wrapper.style.outline = '2px solid #42A5F5';
                wrapper.style.outlineOffset = '-2px';
                wrapper.style.boxShadow = '0 0 0 6px rgba(66,165,245,0.2)';
            });
            card.addEventListener('mouseleave', () => {
                if (card.dataset.selected !== 'true') {
                    wrapper.style.outline = 'none';
                    wrapper.style.boxShadow = 'none';
                } else {
                    updateSelectionUI();
                }
            });

            // 底部按钮
            const actions = document.createElement('div');
            Object.assign(actions.style, {
                display: 'flex',
                gap: '8px',
                marginTop: '10px',
                width: '100%',
                justifyContent: 'center'
            });

            const copyBtn = document.createElement('button');
            copyBtn.textContent = '📋 复制图片';
            copyBtn.className = 'action-btn';
            Object.assign(copyBtn.style, {
                flex: 1,
                padding: '6px 0',
                background: '#e9ecef',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#333',
                cursor: 'pointer',
                transition: 'background 0.2s'
            });
            copyBtn.onmouseenter = () => copyBtn.style.background = '#dee2e6';
            copyBtn.onmouseleave = () => copyBtn.style.background = '#e9ecef';
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                copyImageToClipboard(url);
            });

            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = '📥 下载';
            downloadBtn.className = 'action-btn';
            Object.assign(downloadBtn.style, {
                flex: 1,
                padding: '6px 0',
                background: '#e9ecef',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#333',
                cursor: 'pointer',
                transition: 'background 0.2s'
            });
            downloadBtn.onmouseenter = () => downloadBtn.style.background = '#dee2e6';
            downloadBtn.onmouseleave = () => downloadBtn.style.background = '#e9ecef';
            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadImages([url]);
                showToast('⬇️ 开始下载 1 张图片', 1200);
            });

            actions.append(copyBtn, downloadBtn);
            card.appendChild(actions);
            gridContainer.appendChild(card);
        });

        updateSelectionUI();
    }

    panel.appendChild(header);
    panel.appendChild(toolbar);
    panel.appendChild(gridContainer);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    loadImages();
}

// ============ 创建悬浮触发按钮 ============
function createTrigger() {
    if (document.getElementById('tb-image-downloader-trigger')) return;
    const trigger = document.createElement('div');
    trigger.id = 'tb-image-downloader-trigger';
    Object.assign(trigger.style, {
        position: 'fixed',
        bottom: '100px',
        right: '20px',
        zIndex: '9999',
        backgroundColor: '#ff8a5c',
        color: '#fff',
        padding: '14px 24px',
        borderRadius: '50px',
        fontSize: '16px',
        fontWeight: '600',
        boxShadow: '0 6px 24px rgba(255,138,92,0.5)',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.25s ease',
        letterSpacing: '0.5px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    });
    trigger.textContent = '📷 图片下载';
    trigger.onmouseenter = () => {
        trigger.style.transform = 'scale(1.05)';
        trigger.style.boxShadow = '0 8px 32px rgba(255,138,92,0.7)';
    };
    trigger.onmouseleave = () => {
        trigger.style.transform = 'scale(1)';
        trigger.style.boxShadow = '0 6px 24px rgba(255,138,92,0.5)';
    };
    trigger.onclick = createPanel;
    document.body.appendChild(trigger);
}

// ============ 启动 ============
if (document.readyState === 'complete') {
    createTrigger();
} else {
    window.addEventListener('load', createTrigger);
}