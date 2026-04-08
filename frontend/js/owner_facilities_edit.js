/* =========================================
   FILE: js/owner_facilities_edit.js
========================================= */
const urlParams = new URLSearchParams(window.location.search);
const facilityId = urlParams.get('id');

document.addEventListener("DOMContentLoaded", () => {
    if (!facilityId) {
        alert("Lỗi: Không tìm thấy ID cơ sở.");
        window.location.href = 'list.html';
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('header-email').innerText = user.email || "Owner";
    if (user.avatarUrl) {
        document.getElementById('header-avatar-wrap').innerHTML = `<img src="${user.avatarUrl}" class="w-full h-full object-cover">`;
    }

    initImagePreview();
    loadFacilityData();
    initFormValidationAndSubmit();
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

// 1. TẢI DỮ LIỆU CŨ VÀ ĐIỀN VÀO FORM (BẢN "BẤT TỬ")
async function loadFacilityData() {
    try {
        const res = await fetch(`${BASE_URL}/facilities/${facilityId}`, {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        });
        const data = await res.json();
        
        if (!data.success) throw new Error("Không thể tải dữ liệu");

        const fac = data.data.facility;
        const images = data.data.images || [];

        // Điền text (Thêm bộ lọc an toàn tránh null)
        document.getElementById('name').value = fac.name || '';
        document.getElementById('description').value = fac.description || '';
        document.getElementById('phone').value = fac.phone || '';
        document.getElementById('email').value = fac.email || '';
        document.getElementById('address').value = fac.address || '';
        document.getElementById('openTime').value = fac.openTime || '';
        document.getElementById('closeTime').value = fac.closeTime || '';

        // Hiển thị ảnh cũ (Bộ lọc an toàn đã được nâng cấp)
        renderExistingImages(images);

        // Khởi tạo bản đồ (Nếu DB mất tọa độ thì mặc định về ngã 6 Phù Đổng - HCM)
        const lat = fac.latitude != null ? parseFloat(fac.latitude) : 10.7715;
        const lng = fac.longitude != null ? parseFloat(fac.longitude) : 106.6984;
        initMapLogic(lat, lng);

        // Khởi tạo Tỉnh/Huyện với dữ liệu đã có
        initLocationDropdowns(fac.city || '', fac.district || '');

        // Hiện form
        document.getElementById('loadingOverlay').classList.add('hidden');
        document.getElementById('formContainer').classList.remove('hidden');

    } catch (e) {
        console.error("Lỗi chi tiết:", e); // In lỗi ra Console F12 để dễ dò
        alert("Có lỗi xảy ra khi tải dữ liệu chi tiết cơ sở.");
        window.location.href = 'list.html';
    }
}

// 1.1 RENDER ẢNH "BẤT TỬ" (Lọc bỏ ảnh lỗi trong DB)
function renderExistingImages(images) {
    const container = document.getElementById('existingImagesContainer');
    
    // Nếu mảng rỗng hoặc bị null
    if (!images || !Array.isArray(images) || images.length === 0) {
        container.innerHTML = `<div class="col-span-full p-6 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-slate-500 text-center text-sm">Chưa có hình ảnh nào.</div>`;
        return;
    }

    const domain = BASE_URL.replace('/api/v1', '');
    
    // Lọc ra những tấm ảnh CÓ tồn tại trường imageUrl trong Database
    const validImages = images.filter(img => img && img.imageUrl && img.imageUrl.trim() !== '');

    if (validImages.length === 0) {
        container.innerHTML = `<div class="col-span-full p-6 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-slate-500 text-center text-sm">Hình ảnh bị lỗi dữ liệu trong Database.</div>`;
        return;
    }

    container.innerHTML = validImages.map(img => {
        let imgUrl = img.imageUrl.startsWith('/') ? `${domain}${img.imageUrl}` : img.imageUrl;
        
        // Thuộc tính onerror để nếu ổ cứng mất file ảnh, nó sẽ tự hiện một cái khung xám ghi "Lỗi Ảnh" thay vì ô trắng bóc
        return `
        <div class="relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm h-32">
            <img src="${imgUrl}" onerror="this.src='https://placehold.co/400x300/eeeeee/94a3b8?text=Loi+Anh'" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <label class="cursor-pointer flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                    <input type="checkbox" value="${img._id}" class="delete-img-cb w-4 h-4 rounded border-white text-red-600 focus:ring-red-500 cursor-pointer">
                    Xóa ảnh này
                </label>
            </div>
        </div>`;
    }).join('');
}

// 2. XỬ LÝ ẢNH MỚI (PREVIEW)
function initImagePreview() {
    document.getElementById('images').addEventListener('change', function() {
        const container = document.getElementById('imagePreviewContainer');
        container.innerHTML = '';
        if (this.files) {
            Array.from(this.files).forEach(file => {
                if (!file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    container.innerHTML += `
                    <div class="relative rounded-xl overflow-hidden border border-slate-200 h-28">
                        <img src="${e.target.result}" class="w-full h-full object-cover">
                    </div>`;
                };
                reader.readAsDataURL(file);
            });
        }
    });
}

// 3. XỬ LÝ TỈNH/THÀNH VÀ BẢN ĐỒ 
function initLocationDropdowns(existingCity, existingDistrict) {
    const cityInput = document.getElementById('city');
    const distInput = document.getElementById('district');
    
    cityInput.value = existingCity;
    document.getElementById('city-display').innerText = existingCity || 'Chọn Tỉnh/Thành phố';
    distInput.value = existingDistrict;
    document.getElementById('district-display').innerText = existingDistrict || 'Chọn Quận/Huyện';

    fetch('https://provinces.open-api.vn/api/?depth=1').then(r => r.json()).then(provinces => {
        document.getElementById('city-dropdown').innerHTML = provinces.map(p => `<li class="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm" onclick="selectCity('${p.name}', '${p.code}')">${p.name}</li>`).join('');
        
        window.selectCity = (name, code) => {
            cityInput.value = name;
            document.getElementById('city-display').innerText = name;
            document.getElementById('city-dropdown').classList.add('hidden');
            distInput.value = '';
            document.getElementById('district-display').innerText = 'Đang tải...';
            
            fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`).then(r => r.json()).then(data => {
                document.getElementById('district-display').innerText = 'Chọn Quận/Huyện';
                document.getElementById('district-dropdown').innerHTML = data.districts.map(d => `<li class="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm" onclick="selectDist('${d.name}')">${d.name}</li>`).join('');
            });
        };

        window.selectDist = (name) => {
            distInput.value = name;
            document.getElementById('district-display').innerText = name;
            document.getElementById('district-dropdown').classList.add('hidden');
        };
    });

    document.getElementById('city-wrapper').onclick = () => document.getElementById('city-dropdown').classList.toggle('hidden');
    document.getElementById('district-wrapper').onclick = () => document.getElementById('district-dropdown').classList.toggle('hidden');
}

function initMapLogic(lat, lng) {
    let map = null, marker = null;
    
    function updateCoords(l, g) {
        document.getElementById('latitude').value = l.toFixed(8);
        document.getElementById('longitude').value = g.toFixed(8);
        document.getElementById('latDisplay').innerText = l.toFixed(6);
        document.getElementById('lngDisplay').innerText = g.toFixed(6);
        document.getElementById('coordsDisplay').classList.replace('hidden', 'flex');
    }

    function renderMap(l, g) {
        document.getElementById('facilityMap').classList.remove('hidden');
        if (!map) {
            map = L.map('facilityMap').setView([l, g], 16);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            marker = L.marker([l, g], { draggable: true }).addTo(map);
            marker.on('dragend', (e) => updateCoords(e.target.getLatLng().lat, e.target.getLatLng().lng));
            map.on('click', (e) => { marker.setLatLng(e.latlng); updateCoords(e.latlng.lat, e.latlng.lng); });
        } else {
            map.setView([l, g], 16);
            marker.setLatLng([l, g]);
        }
        updateCoords(l, g);
    }

    renderMap(lat, lng);

    document.getElementById('geocodeBtn').onclick = async function() {
        const address = document.getElementById('address').value;
        const city = document.getElementById('city').value;
        const q = `${address}, ${city}, Vietnam`;
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if(data.length > 0) renderMap(parseFloat(data[0].lat), parseFloat(data[0].lon));
    };
}

// 4. LƯU THAY ĐỔI (ĐA LUỒNG API)
function initFormValidationAndSubmit() {
    document.getElementById('editFacilityForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">sync</span> Đang lưu...';

        try {
            // 4.1 Update Text
            const payload = {
                name: document.getElementById('name').value,
                description: document.getElementById('description').value,
                address: document.getElementById('address').value,
                city: document.getElementById('city').value,
                district: document.getElementById('district').value,
                phone: document.getElementById('phone').value,
                email: document.getElementById('email').value,
                openTime: document.getElementById('openTime').value,
                closeTime: document.getElementById('closeTime').value,
                latitude: parseFloat(document.getElementById('latitude').value),
                longitude: parseFloat(document.getElementById('longitude').value)
            };

            const updateRes = await fetch(`${BASE_URL}/facilities/${facilityId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                body: JSON.stringify(payload)
            });
            if (!updateRes.ok) throw new Error("Lỗi cập nhật thông tin");

            // 4.2 Xóa ảnh cũ 
            const deletedImageIds = Array.from(document.querySelectorAll('.delete-img-cb:checked')).map(cb => cb.value);
            if (deletedImageIds.length > 0) {
                await Promise.all(deletedImageIds.map(imgId => 
                    fetch(`${BASE_URL}/facilities/${facilityId}/images/${imgId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
                    })
                ));
            }

            // 4.3 Upload ảnh mới
            const fileInput = document.getElementById('images');
            if (fileInput.files.length > 0) {
                const formData = new FormData();
                Array.from(fileInput.files).forEach(f => formData.append('images', f));
                await fetch(`${BASE_URL}/facilities/${facilityId}/images`, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                    body: formData
                });
            }

            showToast("Lưu thay đổi thành công!", true);
            setTimeout(() => window.location.href = 'list.html', 1500);

        } catch (error) {
            showToast("Cập nhật thất bại!", false);
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">save</span> Lưu thay đổi';
        }
    });
}