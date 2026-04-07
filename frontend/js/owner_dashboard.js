document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem('token');

    let user = null;
    try {
        user = JSON.parse(localStorage.getItem('user'));
    } catch (e) {
        user = null;
    }

    // 🚨 Check đăng nhập
    if (!token || !user || !user.id) {
        console.warn("🚫 Chưa đăng nhập hợp lệ");
        window.location.href = '../auth/login.html';
        return;
    }

    // ✅ Render header user
    if (user.email) {
        const emailEl = document.getElementById('header-user-email');
        const avatarEl = document.getElementById('header-user-avatar');
        const initialEl = document.getElementById('header-user-initial');

        if (emailEl) emailEl.innerText = user.email;

        if (user.avatarUrl && avatarEl) {
            avatarEl.src = user.avatarUrl;
            avatarEl.classList.remove('hidden');
            if (initialEl) initialEl.classList.add('hidden');
        } else if (initialEl) {
            initialEl.innerText = user.email.charAt(0).toUpperCase();
        }
    }

    loadDashboardData();
    initModalLogic();
});


// ================== LOAD DASHBOARD ==================
async function loadDashboardData() {
    try {
        const response = await fetch(`${BASE_URL}/owner/dashboard`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token') 
            }
        });

        const result = await response.json();

        if (!result.success) throw new Error(result.message);

        const data = result.data;

        // Stats
        document.getElementById('stat-facilities').innerText = data.totalFacilities || 0;
        document.getElementById('stat-fields').innerText = data.totalFields || 0;
        document.getElementById('stat-total-bookings').innerText = data.totalBookings || 0;
        document.getElementById('stat-pending-bookings').innerText = data.pendingBookings || 0;
        document.getElementById('stat-completed-bookings').innerText = data.completedBookings || 0;

        document.getElementById('quick-stat-confirmed').innerText = data.confirmedBookings || 0;
        document.getElementById('quick-stat-completed').innerText = data.completedBookings || 0;
        document.getElementById('quick-stat-pending').innerText = data.pendingBookings || 0;
        document.getElementById('quick-stat-fields').innerText = data.totalFields || 0;

        const mockRevenue = (data.completedBookings || 0) * 150000;
        document.getElementById('stat-revenue').innerText =
            new Intl.NumberFormat('vi-VN').format(mockRevenue) + 'đ';

        renderRecentBookings(data.recentBookings);

    } catch (error) {
        console.error("❌ Lỗi dashboard:", error);
        document.getElementById('recent-bookings-container').innerHTML =
            '<p class="text-red-500 text-center py-6">Lỗi tải dữ liệu</p>';
    }
}


// ================== RENDER BOOKINGS ==================
function renderRecentBookings(bookings) {
    const container = document.getElementById('recent-bookings-container');

    if (!bookings || bookings.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 text-gray-400">
                Chưa có đơn nào
            </div>`;
        return;
    }

    const statusMap = {
        'PENDING': 'Chờ',
        'CONFIRMED': 'Đã xác nhận',
        'CANCELLED': 'Đã hủy',
        'CANCEL_PENDING': 'Yêu cầu hủy',
        'COMPLETED': 'Hoàn thành'
    };

    let html = '';

    bookings.forEach(b => {
        html += `
        <div style="border:1px solid #eee; padding:12px; margin-bottom:10px; border-radius:8px">
            <b>${b.bookingCode}</b> - ${statusMap[b.status] || 'Chờ'}
            <div>${b.user?.fullName || 'Khách'}</div>
            <div>${b.field?.name || 'Sân'}</div>
            <div>${b.startTime} - ${b.endTime}</div>
        </div>`;
    });

    container.innerHTML = html;
}

// Logic điều khiển Modal xử lý duyệt/từ chối hủy đơn
function initModalLogic() {
    const modal = document.getElementById('bookingConfirmModal');
    const modalTitle = document.getElementById('bookingConfirmTitle');
    const modalMessage = document.getElementById('bookingConfirmMessage');
    const modalIconWrap = document.getElementById('bookingConfirmIcon');
    const modalIcon = modalIconWrap.querySelector('.material-symbols-outlined');
    const cancelBtn = document.getElementById('bookingConfirmCancel');
    const submitBtn = document.getElementById('bookingConfirmSubmit');
    
    let targetBookingId = null;
    let targetAction = null;

    // Dùng Event Delegation để bắt sự kiện click cho các nút render động bằng JS
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.btn-booking-action');
        if (!btn) return;

        targetBookingId = btn.getAttribute('data-id');
        targetAction = btn.getAttribute('data-action');

        if (targetAction === 'approve-cancel') {
            modalTitle.textContent = 'Duyệt yêu cầu hủy';
            modalMessage.textContent = 'Khách hàng sẽ được hoàn tiền (nếu có). Bạn có chắc chắn muốn duyệt?';
            submitBtn.textContent = 'Đồng ý Hủy';
            submitBtn.className = 'rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors';
            modalIconWrap.className = 'mt-1 h-11 w-11 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-700';
            modalIcon.textContent = 'check_circle';
        } else if (targetAction === 'reject-cancel') {
            modalTitle.textContent = 'Từ chối hủy đơn';
            modalMessage.textContent = 'Đơn sẽ được khôi phục về trạng thái Đã xác nhận. Bạn chắc chắn chứ?';
            submitBtn.textContent = 'Từ chối Hủy';
            submitBtn.className = 'rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors';
            modalIconWrap.className = 'mt-1 h-11 w-11 rounded-xl flex items-center justify-center bg-red-100 text-red-700';
            modalIcon.textContent = 'cancel';
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });

    function closeModal() {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        targetBookingId = null;
    }

    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target.getAttribute('data-close-modal') === 'true') closeModal(); });

    // Khi ấn nút Xác Nhận trong Modal
    submitBtn.addEventListener('click', async function() {
        if (!targetBookingId || !targetAction) return;

        const isApprove = targetAction === 'approve-cancel';
        
        try {
            submitBtn.innerText = 'Đang xử lý...';
            submitBtn.disabled = true;

            const res = await fetch(`${BASE_URL}/bookings/owner/${targetBookingId}/confirm-cancel`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                body: JSON.stringify({ approve: isApprove })
            });

            const data = await res.json();
            if(data.success) {
                alert(data.message);
                closeModal();
                loadDashboardData(); 
            } else {
                alert('Lỗi: ' + data.message);
            }
        } catch (err) {
            alert('Lỗi kết nối server!');
        } finally {
            submitBtn.disabled = false;
        }
    });
}