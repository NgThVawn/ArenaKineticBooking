/* =========================================
   FILE: js/owner_fields_list.js
========================================= */
const urlParams = new URLSearchParams(window.location.search);
const facilityId = urlParams.get('facilityId');

let allFields = [];
let filteredFields = [];
let currentPage = 1;
const itemsPerPage = 8;
let fieldToDelete = null;

document.addEventListener("DOMContentLoaded", () => {
    if (!facilityId) {
        alert("Không tìm thấy ID cơ sở.");
        window.location.href = '../facilities/list.html';
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('header-email').innerText = user.email || "Owner";
    if (user.avatarUrl) {
        document.getElementById('header-avatar-wrap').innerHTML = `<img src="${user.avatarUrl}" class="w-full h-full object-cover">`;
    }

    // Set link thêm sân mới
    document.getElementById('btnAddField').href = `create.html?facilityId=${facilityId}`;

    loadFacilityAndFields();

    // Lắng nghe tìm kiếm
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase().trim();
        filteredFields = allFields.filter(f => {
            const name = (f.name || '').toLowerCase();
            const sport = (f.sportType || f.sportType?.displayName || '').toLowerCase();
            const surface = (f.surfaceType || '').toLowerCase();
            return name.includes(keyword) || sport.includes(keyword) || surface.includes(keyword);
        });
        currentPage = 1;
        renderTable();
    });
});

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

// 1. TẢI DỮ LIỆU
async function loadFacilityAndFields() {
    const tbody = document.getElementById('tableBody');
    try {
        // Lấy dữ liệu cơ sở và sân con từ API
        const res = await fetch(`${BASE_URL}/facilities/${facilityId}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);

        const fac = data.data.facility;
        document.getElementById('facilityNameTitle').innerText = 'Sân con của: ' + fac.name;

        allFields = data.data.fields || [];
        filteredFields = [...allFields];
        renderTable();

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-red-500 font-bold">Lỗi tải dữ liệu sân</td></tr>`;
    }
}

// 2. HIỂN THỊ DỮ LIỆU (CÓ PHÂN TRANG)
function renderTable() {
    const tbody = document.getElementById('tableBody');
    
    if (filteredFields.length === 0) {
        document.getElementById('paginationContainer').classList.add('hidden');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-16 text-center text-slate-400">
                    <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="material-symbols-outlined text-3xl text-slate-300">${allFields.length === 0 ? 'grid_view' : 'search_off'}</span>
                    </div>
                    <p class="text-base font-bold text-slate-600">${allFields.length === 0 ? 'Chưa có sân nào' : 'Không tìm thấy sân phù hợp'}</p>
                </td>
            </tr>`;
        return;
    }

    const totalPages = Math.ceil(filteredFields.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredFields.slice(start, start + itemsPerPage);

    tbody.innerHTML = currentItems.map(f => {
        const sportName = f.sportType?.displayName || f.sportType || 'Chưa rõ';
        const priceFmt = f.pricePerHour ? new Intl.NumberFormat('vi-VN').format(f.pricePerHour) : '0';

        return `
        <tr class="hover:bg-slate-50/80 transition-colors group">
            <td class="px-6 py-4">
                <p class="font-bold text-slate-900 text-base">${f.name}</p>
            </td>
            <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">${sportName}</span>
            </td>
            <td class="px-6 py-4 text-slate-600 text-sm font-medium">${f.surfaceType || 'N/A'}</td>
            <td class="px-6 py-4 font-bold text-orange-600">${priceFmt} đ</td>
            <td class="px-6 py-4 text-center">
                <div class="relative inline-block w-32"> 
                    <select onchange="updateFieldStatus('${f._id}', this)" data-original-value="${f.status}" 
                        class="appearance-none w-full text-[11px] font-bold rounded-lg border-slate-200 pl-3 pr-8 py-1.5 cursor-pointer outline-none transition-all ${
                            f.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            f.status === 'CLOSED' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                        }">
                        <option value="OPEN" ${f.status === 'OPEN' ? 'selected' : ''}>Hoạt động</option>
                        <option value="CLOSED" ${f.status === 'CLOSED' ? 'selected' : ''}>Tạm đóng</option>
                        <option value="MAINTENANCE" ${f.status === 'MAINTENANCE' ? 'selected' : ''}>Bảo trì</option>
                    </select>
                    <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] opacity-50">expand_more</span>
                </div>
            </td>
            <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                    <a href="edit.html?facilityId=${facilityId}&id=${f._id}" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors text-decoration-none" title="Sửa sân">
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                    </a>
                    <a href="../price-rules/manage.html?facilityId=${facilityId}&fieldId=${f._id}" class="px-2 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-100 text-[11px] font-bold hover:bg-yellow-100 transition-colors text-decoration-none">
                        GIÁ
                    </a>
                    <a href="../blocked-times/manage.html?facilityId=${facilityId}&fieldId=${f._id}" class="px-2 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-bold hover:bg-indigo-100 transition-colors text-decoration-none">
                        CHẶN
                    </a>
                    <button onclick="openDeleteModal('${f._id}', '${f.name}')" class="w-8 h-8 ml-1 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors border-none bg-transparent cursor-pointer" title="Xóa sân">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');

    renderPagination(filteredFields.length, totalPages);
}

// 3. PHÂN TRANG
function renderPagination(totalItems, totalPages) {
    const container = document.getElementById('paginationContainer');
    if (totalPages <= 1) {
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');
    
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    document.getElementById('pageInfo').innerHTML = `${start} - ${end} trong số <span class="text-orange-600">${totalItems}</span> sân`;

    const pageNumbers = document.getElementById('pageNumbers');
    pageNumbers.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.innerHTML += `
            <button onclick="changePage(${i})" class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors border-none cursor-pointer ${i === currentPage ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200 bg-transparent'}">
                ${i}
            </button>`;
    }

    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    
    btnPrev.onclick = () => changePage(currentPage - 1);
    btnPrev.disabled = currentPage === 1;
    btnPrev.classList.toggle('opacity-50', currentPage === 1);
    
    btnNext.onclick = () => changePage(currentPage + 1);
    btnNext.disabled = currentPage === totalPages;
    btnNext.classList.toggle('opacity-50', currentPage === totalPages);
}

function changePage(page) {
    const totalPages = Math.ceil(filteredFields.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderTable();
    }
}

// 4. API ĐỔI TRẠNG THÁI SÂN
async function updateFieldStatus(id, select) {
    const originalStatus = select.getAttribute('data-original-value');
    try {
        const res = await fetch(`${BASE_URL}/fields/${id}/status`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token') 
            },
            body: JSON.stringify({ status: select.value })
        });
        
        const data = await res.json();
        if (res.ok && data.success !== false) {
            showToast("Đã cập nhật trạng thái sân!", true);
            select.setAttribute('data-original-value', select.value);
            
            const baseClass = "appearance-none w-full text-[11px] font-bold rounded-lg border-slate-200 pl-3 pr-8 py-1.5 cursor-pointer outline-none transition-all";
            const statusClass = 
                select.value === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                select.value === 'CLOSED' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-amber-50 text-amber-700 border-amber-200';
            select.className = `${baseClass} ${statusClass}`;
            
            allFields.forEach(f => { if(f._id === id) f.status = select.value; });
        } else {
            throw new Error(data.message);
        }
    } catch (err) {
        showToast("Lỗi cập nhật: " + (err.message || "Kết nối server"), false);
        select.value = originalStatus;
    }
}

// 5. XÓA SÂN CON
function openDeleteModal(id, name) {
    fieldToDelete = id;
    document.getElementById('deleteFieldName').innerText = `"${name}"`;
    const modal = document.getElementById('deleteFieldModal');
    const content = document.getElementById('deleteModalContent');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeDeleteFieldModal() {
    const modal = document.getElementById('deleteFieldModal');
    const content = document.getElementById('deleteModalContent');
    
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        fieldToDelete = null;
    }, 200);
}

document.getElementById('confirmDeleteFieldModal').addEventListener('click', async () => {
    if (!fieldToDelete) return;
    try {
        const res = await fetch(`${BASE_URL}/fields/${fieldToDelete}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();
        
        if (data.success) {
            showToast("Xóa sân thành công!", true);
            closeDeleteFieldModal();
            loadFacilityAndFields(); // Cập nhật bảng
        } else throw new Error(data.message);
    } catch (e) {
        showToast("Lỗi: " + (e.message || "Không thể xóa sân"), false);
        closeDeleteFieldModal();
    }
});