/* =========================================
   FILE: js/owner_notifications.js
========================================= */
document.addEventListener("DOMContentLoaded", () => {
    // Hiển thị thông tin Owner lên Header
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (document.getElementById('header-email')) {
        document.getElementById('header-email').innerText = user.email || "Owner";
    }
    if (user.avatarUrl) {
        const avatarWrap = document.getElementById('header-avatar-wrap');
        if(avatarWrap) avatarWrap.innerHTML = `<img src="${user.avatarUrl}" class="w-full h-full object-cover">`;
    }

    // Tải danh sách thông báo
    loadNotifications();

    // Sự kiện Đánh dấu tất cả đã đọc
    const btnMarkAllRead = document.getElementById('btnMarkAllRead');
    if (btnMarkAllRead) {
        btnMarkAllRead.addEventListener('click', markAllAsRead);
    }
});

// 1. TẢI DANH SÁCH THÔNG BÁO
async function loadNotifications() {
    const container = document.getElementById('notif-list');
    
    try {
        const res = await fetch(`${BASE_URL}/notifications`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const json = await res.json();
        
        if (!json.success) throw new Error(json.message);

        const notifications = Array.isArray(json.data) ? json.data : (json.data?.docs || []);
        renderList(notifications);

    } catch (e) {
        container.innerHTML = `
            <div class="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center mt-6">
                <span class="material-symbols-outlined text-5xl text-red-300 mb-4">error</span>
                <h4 class="font-headline font-bold text-xl mb-2 text-red-600">Lỗi kết nối</h4>
                <p class="text-slate-500">Không thể tải thông báo lúc này.</p>
            </div>`;
    }
}

// 2. HIỂN THỊ DANH SÁCH LÊN UI
function renderList(notifications) {
    const container = document.getElementById('notif-list');
    if (!container) return;

    if (!notifications || notifications.length === 0) {
        container.innerHTML = `
            <div class="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center mt-6">
                <span class="material-symbols-outlined text-6xl text-slate-200 mb-4">notifications_paused</span>
                <h4 class="font-headline font-bold text-xl text-slate-800 mb-2">Hộp thư trống</h4>
                <p class="text-slate-500">Chưa có thông báo nào từ hệ thống.</p>
            </div>`;
        return;
    }
    
    container.innerHTML = notifications.map(n => `
    <div class="flex items-start gap-4 p-5 rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
                ${n.isRead ? 'bg-white border-slate-100' : 'bg-orange-50/60 border-orange-200 shadow-sm'}"
         onclick="handleClick('${n._id}', '${n.link || ''}')">
        
        <div class="flex-shrink-0 w-10 h-10 mt-1 rounded-full flex items-center justify-center ${n.isRead ? 'bg-slate-100 text-slate-400' : 'bg-orange-100 text-orange-600'}">
            <span class="material-symbols-outlined text-[20px]" style="${!n.isRead ? "font-variation-settings: 'FILL' 1;" : ""}">${getIconByMessage(n.title)}</span>
        </div>
        
        <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
                <h4 class="font-bold text-base text-slate-900 font-headline">${escapeHtml(n.title)}</h4>
                ${!n.isRead ? '<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>' : ''}
            </div>
            <p class="text-sm text-slate-600 mt-1.5 font-body leading-relaxed">${escapeHtml(n.message)}</p>
            <div class="text-xs text-slate-400 font-label mt-3 flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[14px]">schedule</span> ${formatTime(n.createdAt)}
            </div>
        </div>
    </div>
    `).join('');
}

// 3. XỬ LÝ CLICK ĐỂ ĐỌC
async function handleClick(id, link) {
    try {
        await fetch(`${BASE_URL}/notifications/${id}/read`, { 
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        
        // Cập nhật lại số lượng badge thông báo trên Sidebar
        if (typeof updateUnreadBadge === "function") {
            updateUnreadBadge();
        }

        if (link && link !== 'null') {
            const path = window.location.pathname;
            let basePath = '../'; 
            if (path.includes('/owner/facilities/') || path.includes('/owner/services/') || 
                path.includes('/owner/fields/') || path.includes('/owner/blocked-times/') || 
                path.includes('/owner/price-rules/') || path.includes('/owner/bookings/') ||
                path.includes('/owner/notifications/')) {
                basePath = '../../';
            }

            let targetUrl = link.startsWith('/') ? link.substring(1) : link;
            if (!targetUrl.includes('.html')) {
                const parts = targetUrl.split('?');
                targetUrl = parts[0] + '.html' + (parts[1] ? '?' + parts[1] : '');
            }
            window.location.href = basePath + targetUrl; 
        } else {
            loadNotifications(); 
        }
    } catch (e) {
        console.error("Lỗi đánh dấu đã đọc", e);
    }
}

// 4. ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC
async function markAllAsRead() {
    try {
        await fetch(`${BASE_URL}/notifications/read-all`, { 
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        
        const badge = document.getElementById('sidebar-notif-badge');
        if (badge) badge.classList.add('hidden');

        loadNotifications(); 
    } catch (e) {
        console.error("Lỗi đánh dấu tất cả", e);
    }
}

// --- UTILS ---
function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text || ''));
    return div.innerHTML;
}

// Tự động đổi Icon tùy theo Tiêu đề thông báo
function getIconByMessage(title) {
    const t = title.toLowerCase();
    if (t.includes('hủy') || t.includes('từ chối') || t.includes('thất bại')) return 'cancel';
    if (t.includes('thành công') || t.includes('duyệt')) return 'check_circle';
    if (t.includes('mới') || t.includes('đặt sân')) return 'event_available';
    if (t.includes('thanh toán') || t.includes('nhận tiền')) return 'payments';
    return 'notifications';
}