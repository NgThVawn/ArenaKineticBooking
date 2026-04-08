/* =========================================
   FILE: js/owner_price_rules_edit.js
========================================= */
const urlParams = new URLSearchParams(window.location.search);
const facilityId = urlParams.get('facilityId');
const fieldId = urlParams.get('fieldId');
const ruleId = urlParams.get('id');

document.addEventListener("DOMContentLoaded", () => {
    if (!facilityId || !fieldId || !ruleId) {
        alert("Thiếu ID cơ sở, Sân hoặc ID Quy tắc.");
        window.location.href = '../facilities/list.html';
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('header-email').innerText = user.email || "Owner";
    if (user.avatarUrl) {
        document.getElementById('header-avatar-wrap').innerHTML = `<img src="${user.avatarUrl}" class="w-full h-full object-cover">`;
    }

    // Set back links
    const backUrl = `manage.html?facilityId=${facilityId}&fieldId=${fieldId}`;
    document.getElementById('breadcrumbFieldsLink').href = `../fields.html?facilityId=${facilityId}`;
    document.getElementById('breadcrumbRulesLink').href = backUrl;
    document.getElementById('btnBackToRules').href = backUrl;
    document.getElementById('btnCancel').href = backUrl;

    loadData();
    initUpdateForm(backUrl);
});

function showToast(msg, isSuccess) {
    const toast = document.getElementById('alertToast');
    toast.className = `mb-6 p-4 rounded-xl shadow-sm transition-all duration-500 flex items-center gap-3 ${isSuccess ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`;
    document.getElementById('toastText').innerText = msg;
    document.getElementById('toastIcon').innerText = isSuccess ? 'check_circle' : 'error';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.remove('opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.classList.add('hidden'), 500);
    }, 3000);
}

// 1. TẢI DỮ LIỆU CŨ
async function loadData() {
    try {
        // A. Load Field Info (Lấy tên sân)
        const resField = await fetch(`${BASE_URL}/fields/${fieldId}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const dataField = await resField.json();
        if (dataField.success) {
            document.getElementById('displayFieldName').innerText = dataField.data.name;
        }

        // B. Load Rule Info
        // Vì Backend không có API GET riêng 1 rule, ta gọi GET ALL rồi filter
        const resRules = await fetch(`${BASE_URL}/price-rules/field/${fieldId}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const dataRules = await resRules.json();
        const rulesList = Array.isArray(dataRules.data) ? dataRules.data : (dataRules.data?.docs || []);
        
        const currentRule = rulesList.find(r => r._id === ruleId);
        
        if (!currentRule) {
            alert("Không tìm thấy quy tắc giá này!");
            window.location.href = `manage.html?facilityId=${facilityId}&fieldId=${fieldId}`;
            return;
        }

        // Bơm dữ liệu cũ vào Form
        document.getElementById('ruleName').value = currentRule.name || '';
        document.getElementById('dayType').value = currentRule.dayType || 'WEEKDAY';
        document.getElementById('startTime').value = currentRule.startTime || '';
        document.getElementById('endTime').value = currentRule.endTime || '';
        document.getElementById('pricePerHour').value = currentRule.pricePerHour || 1000;
        document.getElementById('priority').value = currentRule.priority || 0;

    } catch (e) {
        showToast("Lỗi tải dữ liệu quy tắc cũ.", false);
        console.error(e);
    }
}

// 2. XỬ LÝ CẬP NHẬT FORM
function initUpdateForm(backUrl) {
    document.getElementById('editRuleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSubmit');
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">sync</span> ĐANG LƯU...';

        const payload = {
            name: document.getElementById('ruleName').value,
            dayType: document.getElementById('dayType').value,
            startTime: document.getElementById('startTime').value,
            endTime: document.getElementById('endTime').value,
            pricePerHour: parseFloat(document.getElementById('pricePerHour').value),
            priority: parseInt(document.getElementById('priority').value)
        };

        try {
            // GỌI API PUT /price-rules/:id
            const res = await fetch(`${BASE_URL}/price-rules/${ruleId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token') 
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            showToast("Cập nhật quy tắc thành công!", true);
            
            // Tự động quay lại danh sách sau 1.5 giây
            setTimeout(() => {
                window.location.href = backUrl;
            }, 1500);

        } catch (err) {
            showToast(err.message || "Lỗi cập nhật quy tắc", false);
            btn.disabled = false;
            btn.innerHTML = 'LƯU THAY ĐỔI';
        }
    });
}