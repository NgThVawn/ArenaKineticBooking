/* =========================================
   FILE: js/owner_service_edit.js
========================================= */
const urlParams = new URLSearchParams(window.location.search);
const facilityId = urlParams.get('facilityId');
const serviceId = urlParams.get('id');

document.addEventListener("DOMContentLoaded", () => {
    if (!facilityId || !serviceId) {
        alert("Thiếu ID cơ sở hoặc ID dịch vụ.");
        window.location.href = '../facilities/list.html';
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (document.getElementById('header-email')) {
        document.getElementById('header-email').innerText = user.email || "Owner";
    }

    // Set up Link quay lại
    const backUrl = `manage.html?facilityId=${facilityId}`;
    document.getElementById('breadcrumbFacilityLink').href = backUrl;
    document.getElementById('btnBackToServices').href = backUrl;
    document.getElementById('btnCancel').href = backUrl;

    loadData();
    initUpdateForm(backUrl);
});

function showToast(msg, isSuccess) {
    const toast = document.getElementById('alertToast');
    if (!toast) return;
    toast.className = `mb-6 p-4 rounded-xl shadow-sm transition-all duration-500 flex items-center gap-3 ${isSuccess ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`;
    document.getElementById('toastText').innerText = msg;
    document.getElementById('toastIcon').innerText = isSuccess ? 'check_circle' : 'error';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.remove('opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.classList.add('hidden'), 500);
    }, 3000);
}

// 1. TẢI DỮ LIỆU TỔNG HỢP (Facility, Thể thao, Dịch vụ cũ)
async function loadData() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');

    try {
        // A. Load tên Cơ sở
        const resFac = await fetch(`${BASE_URL}/facilities/${facilityId}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const dataFac = await resFac.json();
        if (dataFac.success) {
            document.getElementById('displayFacilityName').innerText = dataFac.data.facility.name;
            document.getElementById('breadcrumbFacilityLink').innerText = dataFac.data.facility.name;
        }

        // B. Bơm danh sách Môn thể thao cố định (Giống hệt trang Manage)
        const selectSport = document.getElementById('svcSport');
        const sportTypesList = [
            { value: '', name: 'Tất cả loại sân' },
            { value: 'FOOTBALL', name: 'Bóng đá' },
            { value: 'BADMINTON', name: 'Cầu lông' },
            { value: 'TENNIS', name: 'Tennis' },
            { value: 'VOLLEYBALL', name: 'Bóng chuyền' },
            { value: 'BASKETBALL', name: 'Bóng rổ' },
            { value: 'PICKLEBALL', name: 'Pickleball' }
        ];
        selectSport.innerHTML = sportTypesList.map(s => `<option value="${s.value}">${s.name}</option>`).join('');

        // C. Load Dữ liệu Dịch vụ hiện tại
        const resSvc = await fetch(`${BASE_URL}/extra-services/facility/${facilityId}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const dataSvc = await resSvc.json();
        const servicesList = dataSvc.data || [];
        
        const currentService = servicesList.find(s => s._id === serviceId);
        
        if (!currentService) {
            alert("Không tìm thấy dịch vụ này!");
            window.location.href = `manage.html?facilityId=${facilityId}`;
            return;
        }

        // D. Bơm dữ liệu vào UI và Form
        document.getElementById('displayServiceName').innerText = currentService.name;
        
        document.getElementById('svcName').value = currentService.name || '';
        document.getElementById('svcDesc').value = currentService.description || '';
        document.getElementById('svcPrice').value = currentService.price || 0;
        document.getElementById('svcUnit').value = currentService.unit || '';
        
        // Tồn kho
        const stockVal = (currentService.quantity !== undefined && currentService.quantity !== null) ? currentService.quantity : currentService.stock;
        document.getElementById('svcStock').value = stockVal !== null ? stockVal : '';

        // Chọn lại môn thể thao cũ trong Dropdown
        if (currentService.appliesToSportType) {
            // Xử lý cả trường hợp backend trả về object hoặc trả về chuỗi text
            const sportVal = currentService.appliesToSportType.name || currentService.appliesToSportType;
            selectSport.value = sportVal;
        } else {
            selectSport.value = ''; // Chọn 'Tất cả loại sân'
        }

        document.getElementById('svcActive').checked = currentService.isActive !== false;

    } catch (err) {
        showToast("Lỗi kết nối máy chủ khi tải dữ liệu", false);
        console.error(err);
    } finally {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }
}

// 2. XỬ LÝ SỰ KIỆN SUBMIT FORM
function initUpdateForm(backUrl) {
    document.getElementById('editServiceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSubmitForm');
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> ĐANG LƯU...';

        const stockInput = document.getElementById('svcStock').value;
        
        const payload = {
            name: document.getElementById('svcName').value,
            description: document.getElementById('svcDesc').value,
            price: parseFloat(document.getElementById('svcPrice').value),
            unit: document.getElementById('svcUnit').value,
            quantity: stockInput !== "" ? parseInt(stockInput) : null, // Gửi null nếu trống
            appliesToSportType: document.getElementById('svcSport').value || null,
            isActive: document.getElementById('svcActive').checked
        };

        try {
            // YÊU CẦU BACKEND PHẢI CÓ API NÀY (PUT /api/v1/extra-services/:id)
            const res = await fetch(`${BASE_URL}/extra-services/${serviceId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token') 
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok && data.success) {
                showToast("Cập nhật dịch vụ thành công!", true);
                setTimeout(() => { window.location.href = backUrl; }, 1500); // Chờ 1.5s rồi nhảy trang
            } else {
                // Xử lý lỗi mảng hoặc chuỗi từ backend
                let errorMsg = data.message || "Lỗi cập nhật dịch vụ";
                if (Array.isArray(data)) errorMsg = data.map(err => err.msg).join(', ');
                throw new Error(errorMsg);
            }
        } catch (err) {
            showToast(err.message, false);
            btn.disabled = false;
            btn.innerHTML = 'Lưu thay đổi';
        }
    });
}