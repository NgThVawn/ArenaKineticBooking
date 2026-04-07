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
                if (callback) callback();
            })
            .catch(err => console.error("Lỗi load UI:", err));
    }
}

async function initHeader() {
    const path = window.location.pathname;
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Lấy các DOM elements
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
        
        // Ẩn nút Login/Register nếu đang đứng đúng trang đó
        if (path.includes('login.html') && btnLogin) btnLogin.style.display = 'none';
        if (path.includes('register.html') && btnRegister) btnRegister.style.display = 'none';
    } 
    // 2. Chế độ User VIP (Đã đăng nhập)
    else {
        if (guestMenu) guestMenu.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        // Chỉ hiện menu Links (Danh sách sân,...) trên màn hình máy tính (md:flex)
        if (userLinks) {
            userLinks.classList.remove('hidden');
            userLinks.classList.add('md:flex');
        }
        
        // Cập nhật Tên và Avatar
        if (userName) userName.innerText = user.fullName || 'Người dùng';
        if (avatarInitial) avatarInitial.innerText = user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U';

        // 3. Gọi API lấy thông báo giả lập (Thêm BASE_URL nếu ní có API thật)
        const notifContainer = document.getElementById('hover-notif-list');
        const notifBadge = document.getElementById('notif-badge');
        
        if (notifContainer) {
            try {
                // TẠM THỜI MOCK DATA ĐỂ NÍ XEM UI (Gắn API thật sau nha)
                const notifications = [
                    { id: 1, title: 'Đặt sân thành công', message: 'Sân KINETIC Q7 - Hôm nay 18:00', read: false },
                    { id: 2, title: 'Nhắc nhở trận đấu', message: 'Trận đấu sẽ bắt đầu sau 2 tiếng nữa!', read: true }
                ];

                const unreadCount = notifications.filter(n => !n.read).length;

                // Cập nhật số lượng đỏ đỏ trên quả chuông
                if (unreadCount > 0 && notifBadge) {
                    notifBadge.innerText = unreadCount > 99 ? '99+' : unreadCount;
                    notifBadge.style.display = 'flex';
                }

                // Render danh sách thông báo
                if (notifications.length === 0) {
                    notifContainer.innerHTML = '<div class="p-5 text-center text-xs text-gray-400">Chưa có thông báo nào.</div>';
                } else {
                    notifContainer.innerHTML = notifications.slice(0, 5).map(n => `
                        <a href="#" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 no-underline ${n.read ? 'bg-white opacity-70' : 'bg-orange-50/30'}">
                            <div class="w-2 h-2 rounded-full flex-shrink-0 ${n.read ? 'bg-transparent' : 'bg-orange-600'}"></div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-gray-800 truncate m-0 leading-tight">${n.title}</p>
                                <p class="text-xs text-gray-500 truncate m-0 mt-0.5">${n.message}</p>
                            </div>
                        </a>
                    `).join('');
                }
            } catch (e) {
                console.error('Lỗi tải thông báo:', e);
                notifContainer.innerHTML = '<div class="p-4 text-center text-xs text-red-400">Lỗi kết nối.</div>';
            }
        }
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Tự dò đường về login
    const isInAuthFolder = window.location.pathname.includes('/auth/');
    window.location.href = isInAuthFolder ? 'login.html' : 'auth/login.html'; 
}

document.addEventListener("DOMContentLoaded", () => {
    // Thuật toán tự dò đường dẫn (Bất tử trong mọi thư mục)
    const isInAuthFolder = window.location.pathname.includes('/auth/');
    const basePath = isInAuthFolder ? '../' : './';

    // Ghép Layout bằng đường dẫn linh hoạt
    loadComponent("header-placeholder", basePath + "components/header.html", initHeader);
    loadComponent("footer-placeholder", basePath + "components/footer.html");
});