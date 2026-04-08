/* =========================================
   FILE: js/owner_services.js
========================================= */
const urlParams = new URLSearchParams(window.location.search);
const facilityId = urlParams.get('facilityId');
let serviceToDelete = null;

document.addEventListener("DOMContentLoaded", () => {
    if (!facilityId) {
        alert("Thiếu ID cơ sở trong URL (?facilityId=...)");
        window.location.href = '../facilities/list.html';
        return;
    }

    // Hiển thị thông tin user từ localStorage (nếu có)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (document.getElementById('header-email')) {
        document.getElementById('header-email').innerText = user.email || "Owner";
    }

    // Load dữ liệu
    loadFacilityInfo();
    loadSportTypes();
    loadServices();
    initCreateForm();
    initDeleteConfirm();
});

// --- HELPER: HIỂN THỊ THÔNG BÁO ---
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

// --- 1. TẢI TÊN CƠ SỞ ---
async function loadFacilityInfo() {
    try {
        const res = await fetch(`${BASE_URL}/facilities/${facilityId}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const json = await res.json();
        if (json.success) {
            document.getElementById('breadcrumbFacilityName').innerText = json.data.facility.name;
        }
    } catch (e) {
        console.error("Lỗi load facility:", e);
    }
}

// --- 2. TẢI DANH SÁCH MÔN THỂ THAO ---
async function loadSportTypes() {
    const select = document.getElementById('svcSport');
    // Dùng danh sách cố định (backend không có endpoint /sport-types)
    const sportTypes = [
        { value: '', name: 'Tất cả môn thể thao' },
        { value: 'FOOTBALL', name: 'Bóng đá' },
        { value: 'BADMINTON', name: 'Cầu lông' },
        { value: 'TENNIS', name: 'Tennis' },
        { value: 'VOLLEYBALL', name: 'Bóng chuyền' },
        { value: 'BASKETBALL', name: 'Bóng rổ' }
    ];
    
    select.innerHTML = sportTypes
        .map(s => `<option value="${s.value}">${s.name}</option>`)
        .join('');
}

// --- 3. TẢI DANH SÁCH DỊCH VỤ ---
async function loadServices() {
    const tbody = document.getElementById('servicesTableBody');
    tbody.innerHTML = `<tr><td colspan="7" class="py-10 text-center"><span class="material-symbols-outlined animate-spin text-slate-400">sync</span></td></tr>`;

    try {
        // Gọi API lấy dịch vụ theo FacilityId
        const res = await fetch(`${BASE_URL}/extra-services/facility/${facilityId}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const json = await res.json();
        const services = json.data || [];

        document.getElementById('totalServicesCount').innerText = services.length;

        if (services.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-16 text-center text-slate-400"><p class="text-base font-bold text-slate-600">Chưa có dịch vụ nào.</p></td></tr>`;
            return;
        }

        tbody.innerHTML = services.map(svc => `
            <tr class="hover:bg-slate-50/50 transition-colors group align-top">
                <td class="px-6 py-4">
                    <p class="font-bold text-slate-900">${svc.name}</p>
                    <p class="text-xs text-slate-500 whitespace-normal">${svc.description || ''}</p>
                </td>
                <td class="px-6 py-4 font-black text-orange-600">${new Intl.NumberFormat('vi-VN').format(svc.price)}₫</td>
                <td class="px-6 py-4">${svc.unit}</td>
                <td class="px-6 py-4 text-xs font-bold text-indigo-700">${svc.appliesToSportType || 'Tất cả'}</td>
                <td class="px-6 py-4">${svc.quantity && svc.quantity > 0 ? svc.quantity : '∞'}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded-full text-[10px] font-bold ${svc.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}">
                        ${svc.isActive ? 'Đang bật' : 'Đang ẩn'}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <a href="edit.html?facilityId=${facilityId}&id=${svc._id}" class="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 border-none cursor-pointer transition-colors text-decoration-none">
                            Sửa
                        </a>
                        <button onclick="openDeleteModal('${svc._id}', '${svc.name}')" class="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 border-none cursor-pointer transition-colors">
                            Xóa
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-red-500 font-bold">Không thể tải dữ liệu.</td></tr>`;
    }
}

// --- 4. TẠO DỊCH VỤ MỚI ---
function initCreateForm() {
    document.getElementById('createServiceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSubmitForm');
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Đang tạo...';

        const payload = {
            facilityId: facilityId,  // Backend yêu cầu 'facilityId'
            name: document.getElementById('svcName').value,
            description: document.getElementById('svcDesc').value,
            price: parseFloat(document.getElementById('svcPrice').value),
            unit: document.getElementById('svcUnit').value,
            quantity: document.getElementById('svcStock').value ? parseInt(document.getElementById('svcStock').value) : 0,  // Backend dùng 'quantity'
            appliesToSportType: document.getElementById('svcSport').value || null,
            isActive: document.getElementById('svcActive').checked
        };

        console.log('Payload gửi đi:', JSON.stringify(payload, null, 2));

        try {
            const res = await fetch(`${BASE_URL}/extra-services`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token') 
                },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            
            if (res.ok && json.success) {
                showToast("Đã thêm dịch vụ mới!", true);
                document.getElementById('createServiceForm').reset();
                loadServices();
            } else {
                // Xử lý error từ array hoặc object
                let errorMsg = 'Lỗi không xác định';
                if (Array.isArray(json)) {
                    errorMsg = json.map(e => e.msg || e.message || JSON.stringify(e)).join('; ');
                } else if (json.message || json.errors) {
                    errorMsg = json.message || json.errors;
                }
                throw new Error(errorMsg);
            }
        } catch (err) {
            showToast(err.message, false);
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Tạo dịch vụ';
        }
    });
}

// --- 5. XÓA DỊCH VỤ ---
function openDeleteModal(id, name) {
    serviceToDelete = id;
    document.getElementById('deleteServiceName').innerText = `"${name}"`;
    const modal = document.getElementById('deleteConfirmModal');
    const content = document.getElementById('deleteModalContent');
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    const content = document.getElementById('deleteModalContent');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        serviceToDelete = null;
    }, 200);
}

function initDeleteConfirm() {
    document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
        if (!serviceToDelete) return;
        try {
            const res = await fetch(`${BASE_URL}/extra-services/${serviceToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
            });
            const json = await res.json();
            if (json.success) {
                showToast("Đã xóa dịch vụ", true);
                closeDeleteModal();
                loadServices();
            }
        } catch (e) {
            showToast("Lỗi khi xóa", false);
            closeDeleteModal();
        }
    });
}