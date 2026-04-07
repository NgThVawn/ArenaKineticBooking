/* =========================================
   FILE: js/owner_fields_form.js
   Xử lý form tạo/sửa sân con
========================================= */

const urlParams = new URLSearchParams(window.location.search);
const facilityId = urlParams.get('facilityId');
const fieldId = urlParams.get('id');

document.addEventListener("DOMContentLoaded", () => {
    if (!facilityId) {
        alert("Thiếu ID cơ sở trong URL");
        window.location.href = '../facilities/list.html';
        return;
    }

    // Hiển thị user info
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (document.getElementById('header-email')) {
        document.getElementById('header-email').innerText = user.email || "Owner";
    }

    // If editing a field, load its data
    if (fieldId) {
        loadFieldData();
    }

    // Handle form submission
    document.getElementById('fieldForm').addEventListener('submit', handleFormSubmit);
});

// --- HELPER: SHOW TOAST ---
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

// --- LOAD FIELD DATA (EDIT MODE) ---
async function loadFieldData() {
    try {
        const res = await fetch(`${BASE_URL}/fields/${fieldId}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const json = await res.json();
        if (json.success) {
            const field = json.data;
            document.getElementById('fieldName').value = field.name || '';
            document.getElementById('sportType').value = field.sportType || '';
            document.getElementById('description').value = field.description || '';
            document.getElementById('surfaceType').value = field.surfaceType || '';
            document.getElementById('pricePerHour').value = field.pricePerHour || '';
        }
    } catch (e) {
        console.error("Lỗi load field:", e);
        showToast("Không thể tải dữ liệu sân", false);
    }
}

// --- HANDLE FORM SUBMISSION ---
async function handleFormSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitForm');
    btn.disabled = true;
    const originalText = btn.innerText;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Đang xử lý...';

    const payload = {
        facilityId: facilityId,
        name: document.getElementById('fieldName').value,
        sportType: document.getElementById('sportType').value,
        description: document.getElementById('description').value || '',
        surfaceType: document.getElementById('surfaceType').value || '',
        capacity: 1,  // Mặc định capacity = 1
        pricePerHour: parseFloat(document.getElementById('pricePerHour').value)
    };

    try {
        const url = fieldId ? `${BASE_URL}/fields/${fieldId}` : `${BASE_URL}/fields`;
        const method = fieldId ? 'PUT' : 'POST';  // Backend dùng PUT (không phải PATCH)

        // Nếu edit, không cần facilityId
        const dataToSend = fieldId 
            ? { name: payload.name, sportType: payload.sportType, description: payload.description, surfaceType: payload.surfaceType, capacity: payload.capacity, pricePerHour: payload.pricePerHour }
            : payload;

        console.log('Field form - URL:', url);
        console.log('Field form - Method:', method);
        console.log('Field form - Payload:', JSON.stringify(dataToSend, null, 2));

        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify(dataToSend)
        });

        const json = await res.json();
        console.log('Field form - Response status:', res.status);
        console.log('Field form - Response:', JSON.stringify(json, null, 2));

        if (res.ok && json.success) {
            showToast(fieldId ? "Cập nhật sân thành công!" : "Tạo sân thành công!", true);
            setTimeout(() => {
                window.location.href = `list.html?facilityId=${facilityId}`;
            }, 1500);
        } else {
            throw new Error(json.message || json.error || 'Lỗi không xác định');
        }
    } catch (err) {
        console.error('Lỗi:', err);
        showToast(err.message, false);
        btn.disabled = false;
        btn.innerText = originalText;
    }
}
