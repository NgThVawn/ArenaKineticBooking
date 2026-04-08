function loadComponent(id, fileUrl, callback) {
    const element = document.getElementById(id);
    if (element) {
        fetch(fileUrl)
            .then(res => {
                if (!res.ok) throw new Error("Không tìm thấy " + fileUrl);
                return res.text();
            })
            .then(html => {
                element.innerHTML = html;
                if (callback) callback(); // Goi callback sau khi đã nhúng HTML xong
            })
            .catch(err => console.error("Lỗi load UI:", err));
    }
}

async function initHeader() {
    const path = window.location.pathname;
    const token = localStorage.getItem('token');
    const rawData = JSON.parse(localStorage.getItem('user') || '{}');
    const user = rawData.user || rawData;

    // Lấy các DOM elements cơ bản
    const guestMenu = document.getElementById('nav-guest-menu');
    const userMenu = document.getElementById('nav-user-menu');
    const userLinks = document.getElementById('nav-user-links');
    
    const btnLogin = document.getElementById('nav-btn-login');
    const btnRegister = document.getElementById('nav-btn-register');
    const userName = document.getElementById('nav-user-name');
    const avatarInitial = document.getElementById('nav-avatar-initial');

    // 1. Chế độ Khách (Chưa đăng nhập)
    if (!token) {
        if (guestMenu) guestMenu.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
        if (userLinks) userLinks.style.display = 'none';
        
        if (path.includes('login.html') && btnLogin) btnLogin.style.display = 'none';
        if (path.includes('register.html') && btnRegister) btnRegister.style.display = 'none';
    } 
    // 2. Chế độ User (Đã đăng nhập)
    else {
        if (guestMenu) guestMenu.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (userLinks) {
            userLinks.classList.remove('hidden');
            userLinks.classList.add('md:flex');
        }
        
        // A. Bơm Tên User
        if (userName) userName.innerText = user.fullName || 'Người dùng';

        // B. Bơm Avatar
        if (avatarInitial) {
            const avatarContainer = avatarInitial.parentElement; 
            
            if (user.avatarUrl) {
                avatarContainer.innerHTML = `<img src="${user.avatarUrl}" alt="Avatar" class="w-full h-full object-cover">`;
                avatarContainer.classList.remove('bg-gray-200', 'border-gray-200');
                avatarContainer.classList.add('border-orange-600');
            } else if (user.fullName) {
                avatarInitial.innerText = user.fullName.charAt(0).toUpperCase();
            }
        }

        // C. KHỞI ĐỘNG HỆ THỐNG THÔNG BÁO (Chỉ chạy sau khi DOM Header đã tồn tại)
        initNotifications(token);
    }
}

// ==========================================
// HỆ THỐNG THÔNG BÁO (CHUÔNG & DROPDOWN)
// ==========================================
function initNotifications(token) {
    const notifWrapper = document.getElementById('notificationWrapper'); // Lấy bao bọc bên ngoài
    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const notifBadge = document.getElementById('notifBadge');
    const notifList = document.getElementById('notifList');
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    const API_BASE = 'http://localhost:3000/api/v1';

    if (!notifWrapper || !notifDropdown) return;

    let isDropdownOpen = false;
    let hoverTimeout; // Biến giữ độ trễ khi hover chuột

    // 1. Lấy số lượng thông báo chưa đọc
    async function fetchUnreadCount() {
        try {
            const res = await fetch(`${API_BASE}/notifications/unread-count`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success && json.data) {
                const count = json.data.count || json.data || 0; 
                updateBadge(count);
            }
        } catch (e) { console.error('Lỗi lấy số thông báo:', e); }
    }

    // Cập nhật UI cái chấm đỏ
    function updateBadge(count) {
        if (count > 0) {
            notifBadge.innerText = count > 99 ? '99+' : count;
            notifBadge.classList.remove('hidden');
        } else {
            notifBadge.classList.add('hidden');
            notifBadge.innerText = '0';
        }
    }

    // 2. Lấy danh sách thông báo chi tiết
    async function fetchNotifications() {
        notifList.innerHTML = `<div class="p-6 text-center text-zinc-400"><span class="material-symbols-outlined animate-spin text-[24px]">sync</span></div>`;
        try {
            const res = await fetch(`${API_BASE}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            
            if (json.success && json.data && json.data.length > 0) {
                renderNotifications(json.data);
            } else {
                notifList.innerHTML = `
                    <div class="py-10 text-center flex flex-col items-center">
                        <div class="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-3">
                            <span class="material-symbols-outlined text-zinc-300 text-[24px]">notifications_paused</span>
                        </div>
                        <p class="text-sm font-medium text-zinc-500 m-0">Bạn chưa có thông báo nào</p>
                    </div>`;
            }
        } catch (e) { 
            notifList.innerHTML = `<div class="p-4 text-center text-red-500 text-xs font-bold">Lỗi tải dữ liệu.</div>`; 
        }
    }

    // 3. Render HTML (Có gắn thêm data-id và data-read để JS xử lý click)
    function renderNotifications(data) {
        let html = '';
        data.forEach(item => {
            const config = getNotifConfig(item.type);
            const timeStr = timeSince(item.createdAt);
            const unreadClass = item.isRead ? 'opacity-70 bg-white' : 'bg-blue-50/50';
            const dotHtml = item.isRead ? '' : `<span class="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5 indicator-dot"></span>`;

            html += `
                <a href="${item.link || '#'}" data-id="${item._id}" data-read="${item.isRead}" class="notif-item-link flex items-start gap-3 p-4 border-b border-zinc-100 hover:bg-zinc-50 transition-colors text-decoration-none ${unreadClass}">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.bg} ${config.text}">
                        <span class="material-symbols-outlined text-[20px]">${config.icon}</span>
                    </div>
                    <div class="flex-grow min-w-0">
                        <h4 class="text-xs font-bold text-zinc-900 m-0 mb-1 line-clamp-1">${item.title}</h4>
                        <p class="text-[11px] text-zinc-600 m-0 mb-1.5 leading-relaxed line-clamp-2">${item.message}</p>
                        <p class="text-[9px] text-zinc-400 font-label uppercase tracking-widest m-0">${timeStr}</p>
                    </div>
                    ${dotHtml}
                </a>`;
        });
        notifList.innerHTML = html;
    }

    function getNotifConfig(type) {
        switch(type) {
            case 'BOOKING_COMPLETED': return { icon: 'task_alt', bg: 'bg-emerald-100', text: 'text-emerald-600' };
            case 'PAYMENT_SUCCESS': case 'PAYMENT_RECEIVED': return { icon: 'payments', bg: 'bg-green-100', text: 'text-green-600' };
            case 'NEW_BOOKING': case 'BOOKING_CREATED': return { icon: 'event_available', bg: 'bg-amber-100', text: 'text-amber-600' };
            case 'BOOKING_AUTO_CANCELLED': case 'BOOKING_AUTO_CANCELLED_OWNER': return { icon: 'event_busy', bg: 'bg-red-100', text: 'text-red-600' };
            default: return { icon: 'notifications', bg: 'bg-zinc-100', text: 'text-zinc-600' };
        }
    }

    function timeSince(dateStr) {
        const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
        let interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " ngày trước";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " giờ trước";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " phút trước";
        return "Vừa xong";
    }

    // =====================================
    // 🛑 LOGIC HOVER 
    // =====================================
    notifWrapper.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimeout); // Hủy lệnh đóng nếu chuột quay lại
        if (!isDropdownOpen) {
            isDropdownOpen = true;
            notifDropdown.classList.remove('hidden');
            setTimeout(() => {
                notifDropdown.classList.remove('opacity-0', 'scale-95');
                notifDropdown.classList.add('opacity-100', 'scale-100');
            }, 10);
            fetchNotifications(); 
        }
    });

    notifWrapper.addEventListener('mouseleave', () => {
        hoverTimeout = setTimeout(() => {
            isDropdownOpen = false;
            notifDropdown.classList.remove('opacity-100', 'scale-100');
            notifDropdown.classList.add('opacity-0', 'scale-95');
            setTimeout(() => notifDropdown.classList.add('hidden'), 200);
        }, 300); // Trễ 300ms để khách kéo chuột xuống dropdown không bị tắt ngang
    });


    // =====================================
    // 🛑 LOGIC CLICK 1 THÔNG BÁO -> TRỪ SỐ NHANH
    // =====================================
    notifList.addEventListener('click', async (e) => {
        const itemEl = e.target.closest('.notif-item-link');
        
        // Nếu click đúng vào 1 cái thông báo chưa đọc
        if (itemEl && itemEl.dataset.read === 'false') {
            e.preventDefault(); // Chặn chuyển trang ngay
            
            const notifId = itemEl.dataset.id;
            const href = itemEl.getAttribute('href');

            // Đổi UI lập tức cho mượt
            itemEl.dataset.read = 'true';
            itemEl.classList.remove('bg-blue-50/50');
            itemEl.classList.add('opacity-70', 'bg-white');
            const dot = itemEl.querySelector('.indicator-dot');
            if (dot) dot.remove();

            // Trừ 1 ở cái chuông
            let currentCount = parseInt(notifBadge.innerText) || 0;
            updateBadge(currentCount - 1);

            // Bắn API xuống DB ngầm (để sau này khách F5 lại nó không bị xanh lại)
            try {
                // Tùy backend ní thiết kế là PUT hay POST nhé
                await fetch(`${API_BASE}/notifications/${notifId}/read`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (err) { console.error('Lỗi mark as read:', err); }

            // Chuyển trang
            if (href && href !== '#') {
                window.location.href = href;
            }
        }
    });


    // =====================================
    // 🛑 LOGIC MARK ALL READ (ĐÁNH DẤU TẤT CẢ)
    // =====================================
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation(); 
            
            try {
                const res = await fetch(`${API_BASE}/notifications/read-all`, {
                    method: 'PUT', 
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                
                if (json.success) {
                    updateBadge(0); // Tắt sạch số đỏ
                    
                    // Quét đổi màu toàn bộ danh sách hiện tại
                    const unreadItems = notifList.querySelectorAll('.notif-item-link');
                    unreadItems.forEach(item => {
                        item.dataset.read = 'true';
                        item.classList.remove('bg-blue-50/50');
                        item.classList.add('opacity-70', 'bg-white');
                        const dot = item.querySelector('.indicator-dot');
                        if (dot) dot.remove();
                    });

                    if (window.showToast) {
                        window.showToast('Thành công', 'Đã đánh dấu tất cả là đã đọc', 'SUCCESS');
                    }
                }
            } catch (err) { console.error('Lỗi khi mark all read:', err); }
        });
    }

    // Khởi chạy lấy số lượng ngay khi vào web
    fetchUnreadCount();
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login.html'; 
}

// Khởi chạy khi load xong HTML khung
document.addEventListener("DOMContentLoaded", () => {
    loadComponent("header-placeholder", "/components/header.html", initHeader);
    loadComponent("footer-placeholder", "/components/footer.html");
});

// =================================================================
// 🛑 TOAST TRƯỢT NGANG (GỌI TỪ MỌI NƠI)
// =================================================================
// =================================================================
// 🛑 TOAST TRƯỢT NGANG V2 (TỰ ĐỘNG TẠO HỘP CHỨA & HỨNG FLASH MESSAGE)
// =================================================================
window.showToast = function(title, message, type = 'DEFAULT', isSystemNotif = false) {
    // 1. Tự động tạo thẻ div chứa thông báo nếu trang hiện tại chưa có
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-24 right-4 z-[9999] flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(container);
    }

    let icon = 'notifications'; let bg = 'bg-zinc-100'; let text = 'text-zinc-600';
    if (type.includes('SUCCESS') || type.includes('COMPLETED') || type.includes('RECEIVED')) {
        icon = 'check_circle'; bg = 'bg-emerald-100'; text = 'text-emerald-600';
    } else if (type.includes('CANCEL') || type.includes('ERROR')) {
        icon = 'error'; bg = 'bg-red-100'; text = 'text-red-600';
    } else if (type.includes('BOOKING') || type.includes('INFO')) {
        icon = 'info'; bg = 'bg-blue-100'; text = 'text-blue-600';
    } else if (type.includes('WARNING')) {
        icon = 'warning'; bg = 'bg-amber-100'; text = 'text-amber-600';
    }

    const toast = document.createElement('div');
    toast.className = 'toast-enter pointer-events-auto w-[320px] bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-zinc-100 p-4 flex gap-3 cursor-pointer hover:bg-white transition-colors';
    
    toast.innerHTML = `
        <div class="w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${bg} ${text}">
            <span class="material-symbols-outlined text-[20px]">${icon}</span>
        </div>
        <div class="flex-grow min-w-0 pt-0.5">
            <div class="flex justify-between items-start mb-1">
                <h4 class="text-sm font-bold text-zinc-900 m-0">${title}</h4>
                <span class="text-[9px] text-zinc-400 font-label uppercase">Vừa xong</span>
            </div>
            <p class="text-xs text-zinc-600 m-0 leading-relaxed">${message}</p>
        </div>
        <button class="shrink-0 text-zinc-300 hover:text-zinc-600 bg-transparent border-none cursor-pointer p-0 -mt-1 -mr-1 self-start" onclick="this.closest('.toast-enter').remove()">
            <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
    `;

    container.appendChild(toast);

    if (isSystemNotif) {
        const badge = document.getElementById('notifBadge');
        if (badge) {
            let current = parseInt(badge.innerText) || 0;
            badge.innerText = current > 99 ? '99+' : current + 1;
            badge.classList.remove('hidden');
        }
    }

    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 400); 
    }, 4000);
};

// 2. Lắng nghe xem trang trước có "nhắn gửi" cái Toast nào qua không
document.addEventListener('DOMContentLoaded', () => {
    const pendingToast = localStorage.getItem('pendingToast');
    if (pendingToast) {
        const toastData = JSON.parse(pendingToast);
        // Delay 300ms để trang load kịp CSS rồi mới trượt Toast ra cho đẹp
        setTimeout(() => {
            window.showToast(toastData.title, toastData.message, toastData.type);
        }, 300);
        // Hiện xong thì xóa đi để F5 không hiện lại
        localStorage.removeItem('pendingToast'); 
    }
});