async function apiGetUnreadNotifsCount() {
    const response = await fetch(`${BASE_URL}/notifications/unread-count`, {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    });
    return response.json();
}

// 2. HÀM TẢI COMPONENT (Tái sử dụng HTML)
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

// 3. KHỞI TẠO SIDEBAR & REALTIME (Chạy sau khi HTML Sidebar đã được load)
async function initSidebar() {
    const currentPath = window.location.pathname;
    const token = localStorage.getItem('token');

let user = null;
try {
    user = JSON.parse(localStorage.getItem('user'));
} catch (e) {
    user = null;
}

if (!token || !user || !user.id) {
    console.warn("Chưa đăng nhập hợp lệ");
    window.location.href = '../auth/login.html';
    return;
}

    // A. Tự động bôi cam (Active) Tab dựa trên URL hiện tại
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(link => {
        const linkPath = new URL(link.href, window.location.origin).pathname;
        if (currentPath.includes(linkPath)) {
            link.classList.remove('text-slate-400', 'hover:bg-slate-800/50');
            link.classList.add('bg-orange-600', 'text-white', 'shadow-[0_10px_20px_rgba(176,47,0,0.3)]');
        }
    });

    // B. Lấy số lượng thông báo cũ chưa đọc
    try {
        const res = await apiGetUnreadNotifsCount();
        if (res.success && res.data.count > 0) {
            const badge = document.getElementById('sidebar-notif-badge');
            if(badge) badge.classList.remove('hidden');
        }
    } catch (e) {
        console.error("Lỗi đếm thông báo:", e);
    }

    // C. Kết nối Socket.io để bắt thông báo thời gian thực
    if (typeof io !== 'undefined') {
        const socket = io('http://localhost:3000'); // Trỏ đúng domain Backend

        socket.on('connect', () => {
            console.log('✅ Đã kết nối Realtime Socket (Owner)');
            // Báo cho backend biết User ID nào đang online
            socket.emit('register', user.id); 
        });

        socket.on('notification', function(notif) {
            // Khi có thông báo mới: Bật chấm đỏ lên
            const badge = document.getElementById('sidebar-notif-badge');
            if(badge) badge.classList.remove('hidden');
            
            // Hiện bảng Toast trượt vào
            showAdminNotifToast(notif);
        });
    } else {
        console.warn("⚠️ Chưa import thư viện Socket.io trong HTML!");
    }
}

// 4. HÀM VẼ GIAO DIỆN TOAST THÔNG BÁO (Góc trên bên phải)
function showAdminNotifToast(notif) {
    const container = document.getElementById('admin-notif-toast-container');
    if (!container) return;

    // Phân loại màu sắc theo loại sự kiện từ Backend gửi lên
    const typeColors = {
        FACILITY_APPROVED: '#22c55e',          // Xanh lá: Sân được duyệt
        FACILITY_REJECTED: '#ef4444',          // Đỏ: Sân bị từ chối
        NEW_BOOKING: '#3b82f6',                // Xanh dương: Có người đặt sân mới
        BOOKING_CUSTOMER_CANCELLED: '#f97316', // Cam: Khách tự hủy
        PAYMENT_RECEIVED: '#10b981',           // Xanh lá ngọc: Đã nhận tiền
        DEFAULT: '#b02f00'                     // Cam đậm: Mặc định
    };
    const color = typeColors[notif.type] || typeColors.DEFAULT;

    // Tạo khối Div chứa Toast
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: white; border-radius: 12px; padding: 14px 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.1); border-left: 4px solid ${color};
        display: flex; flex-direction: column; gap: 4px; 
        animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        cursor: pointer; font-family: 'Inter', sans-serif;
    `;

    toast.innerHTML = `
        <div style="font-weight:700; font-size:14px; color:#0f172a">${escapeHtml(notif.title)}</div>
        <div style="font-size:13px; color:#64748b; line-height:1.5">${escapeHtml(notif.message)}</div>
    `;

    // Nhấn vào Toast để chuyển hướng (dựa theo trường 'link' backend trả về)
    if (notif.link) {
        toast.addEventListener('click', () => {
            // Frontend HTML thuần cần gắn đuôi .html vào đuôi link backend
            // Ví dụ backend trả: /owner/bookings/123 -> /owner/bookings.html?id=123
            // Cái này tuỳ cách bạn thiết lập định tuyến, nếu chỉ là /owner/bookings.html thì:
            window.location.href = '..' + notif.link + '.html'; 
        });
    }

    container.prepend(toast);
    
    // Tự động trượt mất tiêu sau 6 giây
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 6000);
}

// Hàm chống XSS (Chống hacker chèn mã độc vào nội dung thông báo)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text || ''));
    return div.innerHTML;
}

// 5. XỬ LÝ ĐĂNG XUẤT
function handleLogout() {
    // Xóa sạch dấu vết
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    const path = window.location.pathname;
    let basePath = './';
    
    // Kiểm tra xem đang ở sâu mấy cấp để lùi cho đúng
    // Nếu ở cấp 3 (ví dụ: /owner/notifications/list.html)
    if (path.includes('/owner/facilities/') || 
        path.includes('/owner/services/') || 
        path.includes('/owner/fields/') || 
        path.includes('/owner/blocked-times/') || 
        path.includes('/owner/price-rules/') || 
        path.includes('/owner/bookings/') ||
        path.includes('/owner/notifications/')) {
        basePath = '../../';
    } 
    // Nếu ở cấp 2 (ví dụ: /owner/dashboard.html)
    else if (path.includes('/owner/')) {
        basePath = '../';
    }

    // Chuyển hướng về trang login chuẩn
    window.location.href = basePath + 'auth/login.html'; 
}

// 6. TỰ ĐỘNG CHẠY KHI TRANG LOAD XONG
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    let basePath = './';
    
    // 3-level URLs: /owner/{module}/{page}.html
    if (path.includes('/owner/facilities/') || 
        path.includes('/owner/services/') || 
        path.includes('/owner/fields/') || 
        path.includes('/owner/blocked-times/') || 
        path.includes('/owner/price-rules/') || 
        path.includes('/owner/bookings/') ||
        path.includes('/owner/notifications/')) { // <-- Bổ sung thêm dòng này cho trang Thông báo
        basePath = '../../';
    } else if (path.includes('/owner/') || path.includes('/auth/')) {
        basePath = '../';
    }

    // Giữ nguyên đường dẫn chuẩn của bạn!
    loadComponent(
        "sidebar-placeholder", 
        basePath + "components/sidebar_owner.html", 
        initSidebar 
    );
});