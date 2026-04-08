/* =========================================
   FILE: js/owner_bookings.js
========================================= */
let allBookings = [];
let filteredBookings = [];
let currentPage = 1;
const itemsPerPage = 8;

let actionBookingId = null;
let currentActionType = null; 
let cancelBookingId = null;

document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (document.getElementById('header-email')) {
        document.getElementById('header-email').innerText = user.email || "Owner";
    }
    if (user.avatarUrl) {
        document.getElementById('header-avatar-wrap').innerHTML = `<img src="${user.avatarUrl}" class="w-full h-full object-cover">`;
    }

    loadBookings();

    document.getElementById('btnApplyFilter').addEventListener('click', applyFilter);
    document.getElementById('btnClearFilter').addEventListener('click', () => {
        document.getElementById('filterDate').value = '';
        document.getElementById('filterStatus').value = '';
        applyFilter();
    });

    document.getElementById('cancelBookingForm').addEventListener('submit', handleCancelSubmit);
});

function showToast(msg, isSuccess) {
    const toast = document.getElementById('alertToast');
    if (!toast) return;
    toast.className = `fixed top-20 right-8 z-50 p-4 rounded-xl shadow-lg transition-all duration-500 flex items-center gap-3 ${isSuccess ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`;
    document.getElementById('toastText').innerText = msg;
    document.getElementById('toastIcon').innerText = isSuccess ? 'check_circle' : 'error';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.remove('opacity-0', 'translate-y-[-20px]'), 10);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-[-20px]');
        setTimeout(() => toast.classList.add('hidden'), 500);
    }, 3000);
}

// 1. TẢI DANH SÁCH BOOKING
async function loadBookings() {
    const tbody = document.getElementById('tableBody');
    try {
        // Dùng API lấy tất cả của Owner
        const res = await fetch(`${BASE_URL}/bookings/owner/all?limit=1000`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const json = await res.json();
        
        if (!res.ok || !json.success) {
            if (res.status === 404 || (json.message && json.message.toLowerCase().includes('không tìm thấy'))) {
                allBookings = []; 
                applyFilter();
                return; 
            }
            throw new Error(json.message || "Lỗi từ máy chủ");
        }

        // Bóc tách đúng json.data.bookings do Backend trả về
        allBookings = Array.isArray(json.data?.bookings) ? json.data.bookings : [];
        allBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        applyFilter();

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-red-500 font-bold">Lỗi tải dữ liệu: ${e.message}</td></tr>`;
        console.error(e);
    }
}

// 2. LỌC VÀ HIỂN THỊ DỮ LIỆU
function applyFilter() {
    const filterDate = document.getElementById('filterDate').value;
    const filterStatus = document.getElementById('filterStatus').value;
    
    const btnClear = document.getElementById('btnClearFilter');
    if (filterDate || filterStatus) btnClear.classList.remove('hidden');
    else btnClear.classList.add('hidden');

    filteredBookings = allBookings.filter(b => {
        const bDate = b.bookingDate ? b.bookingDate.split('T')[0] : '';
        const matchDate = !filterDate || bDate === filterDate;
        const matchStatus = !filterStatus || b.status === filterStatus;
        return matchDate && matchStatus;
    });

    document.getElementById('headerBookingCount').innerText = `${filteredBookings.length} đơn`;
    document.getElementById('statTotalBookings').innerText = filteredBookings.length;

    currentPage = 1;
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    const container = document.getElementById('paginationContainer');

    if (filteredBookings.length === 0) {
        container.classList.add('hidden');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-slate-500 py-16">
                    <span class="material-symbols-outlined text-5xl text-slate-300 block mb-3">inbox</span>
                    Không tìm thấy đơn đặt sân nào phù hợp.
                </td>
            </tr>`;
        return;
    }

    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredBookings.slice(start, start + itemsPerPage);

    tbody.innerHTML = currentItems.map(b => {
        const bDate = b.bookingDate ? b.bookingDate.split('T')[0].split('-').reverse().join('/') : '';
        const priceFmt = b.totalPrice ? new Intl.NumberFormat('vi-VN').format(b.totalPrice) : '0';
        const fieldName = b.field ? (b.field.name || 'N/A') : 'N/A';
        const extraItemsText = (b.extraServices && b.extraServices.length > 0) 
            ? `<div class="mt-2 text-xs text-slate-500"><span class="font-semibold">Dịch vụ:</span> ${b.extraServices.map(ex => `${ex.serviceName || 'Dịch vụ'} x${ex.quantity}`).join(', ')}</div>` 
            : '';

        let statusBadge = '';
        let statusText = '';
        let actionButtons = '';

        if (b.status === 'PENDING') {
            statusText = 'Chờ duyệt';
            statusBadge = 'bg-amber-50 text-amber-700 border-amber-100';
            actionButtons = `
                <button onclick="openConfirmModal('approve', '${b._id}')" class="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 border-none cursor-pointer transition-colors" title="Duyệt đơn">
                    <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">check</span> Duyệt
                </button>
                <button onclick="openCancelModal('${b._id}', 'PENDING')" class="inline-flex items-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 border-none cursor-pointer transition-colors">
                    <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">close</span> Từ chối
                </button>
            `;
        } else if (b.status === 'CONFIRMED') {
            statusText = 'Đã duyệt';
            statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-100';
            actionButtons = `
                <a href="/owner/invoices/detail.html?bookingId=${b._id}" class="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors no-underline">
                    <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">receipt</span> Hóa đơn
                </a>
                <button onclick="openCancelModal('${b._id}', 'CONFIRMED')" class="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 cursor-pointer transition-colors">
                    <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">cancel</span> Hủy đơn
                </button>
            `;
        } else if (b.status === 'CANCEL_PENDING') {
            statusText = 'Khách xin hủy';
            statusBadge = 'bg-cyan-50 text-cyan-700 border-cyan-100';
            actionButtons = `
                <button onclick="openConfirmModal('approve-cancel', '${b._id}')" class="inline-flex items-center gap-1 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700 border-none cursor-pointer transition-colors">
                    <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">task_alt</span> Cho phép hủy
                </button>
                <button onclick="openConfirmModal('reject-cancel', '${b._id}')" class="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 border-none cursor-pointer transition-colors">
                    <span class="material-symbols-outlined text-[16px]">block</span> Bác bỏ
                </button>
            `;
        } else if (b.status === 'COMPLETED') {
            statusText = 'Hoàn thành';
            statusBadge = 'bg-slate-100 text-slate-600 border-slate-200';
            actionButtons = `
                <a href="/owner/invoices/detail.html?bookingId=${b._id}" class="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors no-underline">
                    <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">receipt</span> Hóa đơn
                </a>
            `;
        } else {
            statusText = 'Đã hủy';
            statusBadge = 'bg-red-50 text-red-700 border-red-100';
            actionButtons = `<span class="text-slate-400 text-sm italic px-2 py-2">Không có thao tác</span>`;
        }

        return `
        <tr class="hover:bg-slate-50/70 transition-colors align-top">
            <td class="px-5 py-4"><span class="inline-flex font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">${b.bookingCode || b._id.slice(-6).toUpperCase()}</span></td>
            <td class="px-5 py-4"><div class="font-semibold text-primary">${fieldName}</div></td>
            <td class="px-5 py-4">
                <div class="font-bold text-on-surface">${bDate}</div>
                <div class="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">schedule</span> ${b.startTime} - ${b.endTime}
                </div>
            </td>
            <td class="px-5 py-4 text-right font-bold text-orange-600">${priceFmt}₫</td>
            <td class="px-5 py-4">
                <span class="${b.note ? 'text-slate-500 text-sm' : 'text-slate-400'}">${b.note || '—'}</span>
                ${extraItemsText}
            </td>
            <td class="px-5 py-4">
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${statusBadge}">${statusText}</span>
            </td>
            <td class="px-5 py-4">
                <div class="flex flex-wrap justify-center gap-2">${actionButtons}</div>
            </td>
        </tr>`;
    }).join('');

    renderPagination(filteredBookings.length, totalPages);
}

function renderPagination(totalItems, totalPages) {
    const container = document.getElementById('paginationContainer');
    if (totalPages <= 1) {
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');
    
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    document.getElementById('pageInfo').innerHTML = `${start} - ${end} trong số <span class="text-orange-600">${totalItems}</span> đơn`;

    const pageNumbers = document.getElementById('pageNumbers');
    pageNumbers.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.innerHTML += `
            <button onclick="changePage(${i})" class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors border-none cursor-pointer ${i === currentPage ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200 bg-transparent'}">
                ${i}
            </button>`;
    }
}

function changePage(page) {
    currentPage = page;
    renderTable();
}

// 3. LOGIC MODAL XÁC NHẬN NHANH (DUYỆT, CHO PHÉP HỦY, BÁC BỎ)
function openConfirmModal(actionType, id) {
    actionBookingId = id;
    currentActionType = actionType;

    const modalTitle = document.getElementById('bookingConfirmTitle');
    const modalMessage = document.getElementById('bookingConfirmMessage');
    const modalIconWrap = document.getElementById('bookingConfirmIcon');
    const modalIcon = modalIconWrap.querySelector('span');
    const submitBtn = document.getElementById('bookingConfirmSubmit');

    if (actionType === 'approve') {
        modalTitle.textContent = 'Xác nhận duyệt đơn';
        modalMessage.textContent = 'Đơn đặt sân sẽ được chuyển sang trạng thái đã duyệt. Bạn có chắc chắn muốn tiếp tục?';
        submitBtn.textContent = 'Duyệt đơn';
        submitBtn.className = 'rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors border-none cursor-pointer';
        modalIconWrap.className = 'mt-1 h-11 w-11 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-700';
        modalIcon.textContent = 'check_circle';
    } else if (actionType === 'approve-cancel') {
        modalTitle.textContent = 'Chấp thuận hủy đơn';
        modalMessage.textContent = 'Bạn đồng ý cho khách hủy đơn này. Thao tác này sẽ đổi trạng thái đơn sang đã hủy.';
        submitBtn.textContent = 'Cho phép hủy';
        submitBtn.className = 'rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors border-none cursor-pointer';
        modalIconWrap.className = 'mt-1 h-11 w-11 rounded-xl flex items-center justify-center bg-cyan-100 text-cyan-700';
        modalIcon.textContent = 'task_alt';
    } else if (actionType === 'reject-cancel') {
        modalTitle.textContent = 'Từ chối yêu cầu hủy';
        modalMessage.textContent = 'Yêu cầu hủy của khách sẽ bị bác bỏ và đơn quay lại trạng thái đã duyệt. Bạn có chắc chắn?';
        submitBtn.textContent = 'Bác bỏ yêu cầu';
        submitBtn.className = 'rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors border-none cursor-pointer';
        modalIconWrap.className = 'mt-1 h-11 w-11 rounded-xl flex items-center justify-center bg-slate-100 text-slate-700';
        modalIcon.textContent = 'block';
    }

    const modal = document.getElementById('bookingConfirmModal');
    const content = document.getElementById('confirmModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeConfirmModal() {
    const modal = document.getElementById('bookingConfirmModal');
    const content = document.getElementById('confirmModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        actionBookingId = null;
        currentActionType = null;
    }, 200);
}

document.getElementById('bookingConfirmSubmit').addEventListener('click', async () => {
    if (!actionBookingId || !currentActionType) return;
    
    let apiUrl = '';
    let payload = {};

    if (currentActionType === 'approve') {
        apiUrl = `${BASE_URL}/bookings/owner/${actionBookingId}/confirm`;
    } else if (currentActionType === 'approve-cancel') {
        apiUrl = `${BASE_URL}/bookings/owner/${actionBookingId}/confirm-cancel`;
        payload = { approve: true };
    } else if (currentActionType === 'reject-cancel') {
        apiUrl = `${BASE_URL}/bookings/owner/${actionBookingId}/confirm-cancel`;
        payload = { approve: false };
    }

    try {
        const res = await fetch(apiUrl, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token') 
            },
            body: Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined
        });
        const data = await res.json();
        
        if (data.success) {
            showToast(data.message || "Thao tác thành công", true);
            closeConfirmModal();
            loadBookings();
        } else {
            throw new Error(data.message);
        }
    } catch (e) {
        showToast(e.message || "Lỗi xử lý", false);
        closeConfirmModal();
    }
});

// 4. LOGIC MODAL HỦY / TỪ CHỐI (CÓ NHẬP LÝ DO)
function openCancelModal(id, status) {
    cancelBookingId = id;
    const title = document.getElementById('cancelModalTitle');
    const input = document.getElementById('cancelReasonInput');
    
    title.textContent = status === 'PENDING' ? 'Từ chối đơn đặt sân' : 'Hủy đơn đã duyệt';
    input.value = '';

    const modal = document.getElementById('cancelBookingModal');
    const content = document.getElementById('cancelModalContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
        input.focus();
    }, 10);
}

function closeCancelModal() {
    const modal = document.getElementById('cancelBookingModal');
    const content = document.getElementById('cancelModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        cancelBookingId = null;
    }, 200);
}

async function handleCancelSubmit(e) {
    e.preventDefault();
    if (!cancelBookingId) return;

    const reason = document.getElementById('cancelReasonInput').value;
    const btn = document.getElementById('btnSubmitCancel');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Đang xử lý...';

    try {
        const res = await fetch(`${BASE_URL}/bookings/owner/${cancelBookingId}/cancel`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token') 
            },
            body: JSON.stringify({ cancelReason: reason }) // Gửi cancelReason cho API
        });
        const data = await res.json();
        
        if (data.success) {
            showToast(data.message || "Đã xử lý hủy/từ chối đơn", true);
            closeCancelModal();
            loadBookings();
        } else {
            throw new Error(data.message);
        }
    } catch (e) {
        showToast(e.message || "Lỗi xử lý", false);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Xác nhận';
    }
}