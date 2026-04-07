/* =========================================
   FILE: js/owner_facilities.js
========================================= */
let allFacilities = [];
let currentPage = 1;
const itemsPerPage = 8;
let facilityToDelete = null;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Render Header User từ LocalStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('header-email').innerText = user.email || "Owner";
    if (user.avatarUrl) {
        document.getElementById('header-avatar-wrap').innerHTML = `<img src="${user.avatarUrl}" class="w-full h-full object-cover">`;
    }

    loadFacilities();

    // 2. Logic Tìm kiếm Real-time
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allFacilities.filter(item => {
            const fac = item.facility || item;
            return (fac.name && fac.name.toLowerCase().includes(term)) || 
                   (fac.address && fac.address.toLowerCase().includes(term));
        });
        currentPage = 1;
        renderTable(filtered);
    });
});

// Helper: Thông báo Toast
function showToast(msg, isSuccess) {
    const toast = document.getElementById('alertToast');
    toast.className = `fixed top-20 right-8 z-50 p-4 rounded-xl shadow-lg transition-all duration-500 flex ${isSuccess ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`;
    document.getElementById('toastText').innerText = msg;
    document.getElementById('toastIcon').innerText = isSuccess ? 'check_circle' : 'error';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.remove('opacity-0', 'translate-y-[-20px]'), 10);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-[-20px]');
        setTimeout(() => toast.classList.add('hidden'), 500);
    }, 3000);
}

// 3. TẢI DANH SÁCH CƠ SỞ
async function loadFacilities() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = `<tr><td colspan="5" class="py-10 text-center"><span class="material-symbols-outlined animate-spin text-slate-400">sync</span></td></tr>`;
    
    try {
        // Sử dụng API Owner để lấy toàn bộ danh sách (cả ẩn lẫn hiện)
        const res = await fetch(`${BASE_URL}/facilities/owner/all`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);

        // API FindByOwner trả về mảng trực tiếp
        allFacilities = data.data || [];
        renderTable(allFacilities);

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-10 text-center text-red-500 font-bold">Không thể tải dữ liệu</td></tr>`;
    }
}

// 4. HIỂN THỊ VÀ PHÂN TRANG
function renderTable(list) {
    const totalPages = Math.ceil(list.length / itemsPerPage) || 1;
    const start = (currentPage - 1) * itemsPerPage;
    const currentItems = list.slice(start, start + itemsPerPage);

    displayRows(currentItems);
    renderPagination(list.length, totalPages);
}

function displayRows(list) {
    const tbody = document.getElementById('tableBody');
    const domain = BASE_URL.replace('/api/v1', ''); // Lấy http://localhost:3000

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-slate-500 font-medium">Danh sách trống.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(item => {
        const fac = item.facility || item;
        // Lấy ảnh primary từ API FindAll hoặc ảnh đầu tiên từ mảng images của FindByOwner
        const imgObj = item.primaryImage || (item.images && item.images[0]) || (fac.images && fac.images[0]);

        // Fix đường dẫn ảnh
        let imgSrc = 'https://placehold.co/100x100/eeeeee/94a3b8?text=No+Image';
        if (imgObj && imgObj.imageUrl) {
            imgSrc = imgObj.imageUrl.startsWith('/') ? `${domain}${imgObj.imageUrl}` : imgObj.imageUrl;
        }

        const isLocked = fac.status === 'BLOCKED' || fac.status === 'PENDING_APPROVAL';

        return `
        <tr class="hover:bg-slate-50/50 transition-colors group">
            <td class="px-6 py-4">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                        <img src="${imgSrc}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/100x100/eee/999?text=Error'">
                    </div>
                    <div>
                        <p class="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">${fac.name}</p>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-xs font-bold text-amber-500 flex items-center gap-0.5"><span class="material-symbols-outlined text-[14px]">star</span> ${fac.avgRating || 0}</span>
                            <span class="text-xs text-slate-400">(${fac.reviewCount || 0} đánh giá)</span>
                        </div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <p class="text-sm font-bold text-slate-700 truncate max-w-[180px]">${fac.address}</p>
                <p class="text-xs text-slate-500 mt-0.5">${fac.district || ''}, ${fac.city || ''}</p>
            </td>
            <td class="px-6 py-4">
                <p class="text-sm font-bold text-slate-700">${fac.phone || '--'}</p>
                <p class="text-xs text-slate-500 mt-0.5">${fac.openTime || '00:00'} - ${fac.closeTime || '00:00'}</p>
            </td>
            <td class="px-6 py-4 text-center">
                <select onchange="updateStatus('${fac._id}', this)" data-original-value="${fac.status}" class="text-xs font-bold rounded-lg border-slate-200 px-3 py-1.5 pr-8 cursor-pointer outline-none transition-all ${
                    fac.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    fac.status === 'CLOSED' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                    fac.status === 'MAINTENANCE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-red-50 text-red-700 border-red-200'
                }" ${isLocked ? 'disabled' : ''}>
                    <option value="OPEN" ${fac.status === 'OPEN' ? 'selected' : ''}>Hoạt động</option>
                    <option value="CLOSED" ${fac.status === 'CLOSED' ? 'selected' : ''}>Tạm đóng</option>
                    <option value="MAINTENANCE" ${fac.status === 'MAINTENANCE' ? 'selected' : ''}>Bảo trì</option>
                    ${isLocked ? `<option value="${fac.status}" selected>${fac.status === 'BLOCKED' ? 'Bị khóa' : 'Chờ duyệt'}</option>` : ''}
                </select>
            </td>
            <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <a href="../fields/list.html?facilityId=${fac._id}" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Sân con"><span class="material-symbols-outlined text-[18px]">grid_view</span></a>
                    <a href="../services/manage.html?facilityId=${fac._id}" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-cyan-600 hover:bg-cyan-50" title="Dịch vụ"><span class="material-symbols-outlined text-[18px]">local_cafe</span></a>
                    <a href="edit.html?id=${fac._id}" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-orange-600 hover:bg-orange-50" title="Sửa"><span class="material-symbols-outlined text-[18px]">edit</span></a>
                    <button onclick="openDeleteModal('${fac._id}', '${fac.name}')" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 border-none bg-transparent cursor-pointer" title="Xóa"><span class="material-symbols-outlined text-[18px]">delete</span></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function renderPagination(totalItems, totalPages) {
    const container = document.getElementById('paginationContainer');
    if (totalItems <= itemsPerPage) { container.classList.add('hidden'); return; }
    container.classList.remove('hidden');
    
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    document.getElementById('pageInfo').innerText = `${start}-${end} / ${totalItems}`;

    const pageNumbers = document.getElementById('pageNumbers');
    pageNumbers.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.innerHTML += `<button onclick="changePage(${i})" class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border-none cursor-pointer ${i === currentPage ? 'bg-orange-600 text-white' : 'text-slate-500 bg-transparent'}">${i}</button>`;
    }
}

function changePage(page) { currentPage = page; renderTable(allFacilities); }

// 5. CẬP NHẬT TRẠNG THÁI (Dùng PATCH /status)
async function updateStatus(id, select) {
    const originalStatus = select.getAttribute('data-original-value');
    try {
        const res = await fetch(`${BASE_URL}/facilities/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
            body: JSON.stringify({ status: select.value })
        });
        const data = await res.json();
        if (res.ok) {
            showToast("Đã cập nhật trạng thái!", true);
            select.setAttribute('data-original-value', select.value);
            // Refresh giao diện để cập nhật màu sắc
            renderTable(allFacilities.map(item => {
                const fac = item.facility || item;
                if (fac._id === id) fac.status = select.value;
                return item;
            }));
        } else throw new Error(data.message);
    } catch (err) {
        showToast("Lỗi: " + err.message, false);
        select.value = originalStatus;
    }
}

// 6. XÓA CƠ SỞ
function openDeleteModal(id, name) {
    facilityToDelete = id;
    document.getElementById('deleteFacilityName').innerText = `"${name}"`;
    document.getElementById('deleteModal').classList.replace('hidden', 'flex');
    setTimeout(() => document.getElementById('deleteModalContent').classList.remove('scale-95', 'opacity-0'), 10);
}

function closeDeleteModal() {
    document.getElementById('deleteModalContent').classList.add('scale-95', 'opacity-0');
    setTimeout(() => { document.getElementById('deleteModal').classList.replace('flex', 'hidden'); facilityToDelete = null; }, 200);
}

document.getElementById('btnConfirmDelete').onclick = async () => {
    try {
        const res = await fetch(`${BASE_URL}/facilities/${facilityToDelete}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        if (res.ok) {
            showToast("Xóa thành công!", true);
            closeDeleteModal();
            loadFacilities();
        }
    } catch (e) { showToast("Lỗi khi xóa", false); }
};