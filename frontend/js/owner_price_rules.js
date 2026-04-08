/* =========================================
   FILE: js/owner_price_rules.js
========================================= */
const urlParams = new URLSearchParams(window.location.search);
const facilityId = urlParams.get('facilityId');
const fieldId = urlParams.get('fieldId');
let ruleToDelete = null;

document.addEventListener("DOMContentLoaded", () => {
    if (!facilityId || !fieldId) {
        alert("Thiếu ID cơ sở hoặc ID sân.");
        window.location.href = '../facilities/list.html';
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('header-email').innerText = user.email || "Owner";
    if (user.avatarUrl) {
        document.getElementById('header-avatar-wrap').innerHTML = `<img src="${user.avatarUrl}" class="w-full h-full object-cover">`;
    }

    // Set back links
    document.getElementById('breadcrumbFieldsLink').href = `../fields.html?facilityId=${facilityId}`;
    document.getElementById('btnBackToFields').href = `../fields.html?facilityId=${facilityId}`;

    loadFieldAndRules();
    initCreateForm();
});

function showToast(msg, isSuccess) {
    const toast = document.getElementById('alertToast');
    toast.className = `fixed top-20 right-8 z-50 p-4 rounded-xl shadow-lg transition-all duration-500 flex ${isSuccess ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`;
    document.getElementById('toastText').innerText = msg;
    document.getElementById('toastIcon').innerText = isSuccess ? 'check_circle' : 'error';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.remove('opacity-0', 'translate-y-[-20px]'), 10);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-[-20px]');
        setTimeout(() => toast.classList.add('hidden'), 500);
    }, 3000);
}

// 1. TẢI THÔNG TIN SÂN & DANH SÁCH QUY TẮC
async function loadFieldAndRules() {
    const tbody = document.getElementById('rulesTableBody');
    tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center"><span class="material-symbols-outlined animate-spin text-slate-400">sync</span></td></tr>`;

    try {
        // A. Load Field Info (Để lấy tên & giá cơ bản)
        const resField = await fetch(`${BASE_URL}/fields/${fieldId}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const dataField = await resField.json();
        if (dataField.success) {
            const f = dataField.data;
            document.getElementById('displayFieldName').innerText = f.name;
            const price = f.pricePerHour ? new Intl.NumberFormat('vi-VN').format(f.pricePerHour) : '0';
            document.getElementById('displayBasePrice').innerText = price + '₫';
        }

        // B. Load Price Rules
        const resRules = await fetch(`${BASE_URL}/price-rules/field/${fieldId}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const dataRules = await resRules.json();
        const rules = Array.isArray(dataRules.data) ? dataRules.data : (dataRules.data?.docs || []);

        if (rules.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-16 text-center text-slate-400">
                        <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span class="material-symbols-outlined text-3xl text-slate-300">payments</span>
                        </div>
                        <p class="text-base font-bold text-slate-600 m-0">Sân này đang thu giá cơ bản ở mọi khung giờ.</p>
                        <p class="text-xs mt-1">Hãy thêm quy tắc giá cao điểm/thấp điểm ở cột bên phải.</p>
                    </td>
                </tr>`;
            return;
        }

        // Helper Map DayType
        const getDayTypeName = (dt) => {
            if (dt === 'WEEKDAY') return 'Ngày thường';
            if (dt === 'WEEKEND') return 'Cuối tuần';
            if (dt === 'HOLIDAY') return 'Ngày lễ';
            return dt;
        };

        tbody.innerHTML = rules.map(r => {
            const priceFmt = r.pricePerHour ? new Intl.NumberFormat('vi-VN').format(r.pricePerHour) : '0';
            return `
            <tr class="hover:bg-slate-50/50 transition-colors group">
                <td class="px-6 py-4 font-bold text-slate-900">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-orange-500"></span>
                        <span>${r.name}</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[11px] font-bold font-label uppercase tracking-wider">${getDayTypeName(r.dayType)}</span>
                </td>
                <td class="px-6 py-4 font-bold text-slate-700">${r.startTime} - ${r.endTime}</td>
                <td class="px-6 py-4 font-black font-headline text-orange-600">${priceFmt}₫</td>
                <td class="px-6 py-4 text-center">
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-white text-[10px] font-bold">${r.priority || 0}</span>
                </td>
                <td class="px-6 py-4 text-right opacity-50 group-hover:opacity-100 transition-opacity">
                    <a href="edit.html?facilityId=${facilityId}&fieldId=${fieldId}&id=${r._id}" class="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors text-decoration-none mr-2 inline-flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">edit</span> Sửa
                    </a>
                    <button onclick="openDeleteModal('${r._id}')" class="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors border-none cursor-pointer inline-flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">delete</span> Xóa
                    </button>
                </td>
            </tr>`;
        }).join('');

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-red-500 font-bold">Lỗi tải dữ liệu. Hãy kiểm tra API.</td></tr>`;
        console.error(e);
    }
}

// 2. TẠO QUY TẮC MỚI
function initCreateForm() {
    document.getElementById('createRuleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSubmitRule');
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">sync</span> Đang tạo...';

        const payload = {
            fieldId: fieldId, // Bắt buộc truyền vào body
            name: document.getElementById('ruleName').value,
            dayType: document.getElementById('dayType').value,
            startTime: document.getElementById('startTime').value,
            endTime: document.getElementById('endTime').value,
            pricePerHour: parseFloat(document.getElementById('pricePerHour').value),
            priority: parseInt(document.getElementById('priority').value)
        };

        try {
            const res = await fetch(`${BASE_URL}/price-rules`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token') 
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            showToast("Tạo quy tắc giá thành công!", true);
            document.getElementById('createRuleForm').reset();
            document.getElementById('priority').value = "1";
            loadFieldAndRules();

        } catch (err) {
            showToast(err.message || "Lỗi tạo quy tắc", false);
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Tạo quy tắc giá';
        }
    });
}

// 3. XÓA QUY TẮC
function openDeleteModal(id) {
    ruleToDelete = id;
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
        ruleToDelete = null;
    }, 200);
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!ruleToDelete) return;
    try {
        const res = await fetch(`${BASE_URL}/price-rules/${ruleToDelete}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();
        
        if (data.success) {
            showToast("Xóa quy tắc thành công", true);
            closeDeleteModal();
            loadFieldAndRules();
        } else throw new Error();
    } catch (e) {
        showToast("Lỗi khi xóa", false);
        closeDeleteModal();
    }
});