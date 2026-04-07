/* =========================================
   FILE: js/owner_facilities_create.js
========================================= */
document.addEventListener("DOMContentLoaded", () => {
    // 1. Render Header User
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('header-email').innerText = user.email || "Owner";
    if (user.avatarUrl) {
        document.getElementById('header-avatar-wrap').innerHTML = `<img src="${user.avatarUrl}" class="w-full h-full object-cover">`;
    }

    initImagePreview();
    initLocationDropdowns();
    initMapLogic();
    initFormValidationAndSubmit();
});

// Toast Helper
function showToast(msg, isSuccess) {
    const toast = document.getElementById('alertToast');
    const text = document.getElementById('toastText');
    const icon = document.getElementById('toastIcon');

    toast.className = `fixed top-20 right-8 z-50 p-4 rounded-xl shadow-lg transition-all duration-500 flex ${isSuccess ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`;
    text.innerText = msg;
    icon.innerText = isSuccess ? 'check_circle' : 'error';
    
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.remove('opacity-0', 'translate-y-[-20px]'), 10);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-[-20px]');
        setTimeout(() => toast.classList.add('hidden'), 500);
    }, 3000);
}

// 2. IMAGE PREVIEW
function initImagePreview() {
    const imgInput = document.getElementById('images');
    const previewContainer = document.getElementById('imagePreviewContainer');

    imgInput.addEventListener('change', function() {
        previewContainer.innerHTML = '';
        if (this.files && this.files.length > 0) {
            Array.from(this.files).forEach(file => {
                if (!file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    const div = document.createElement('div');
                    div.className = 'relative rounded-xl overflow-hidden border border-slate-200 shadow-sm h-28 group';
                    div.innerHTML = `
                        <img src="${e.target.result}" class="w-full h-full object-cover">
                        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 to-transparent p-2">
                            <p class="text-[10px] text-white truncate font-medium">${file.name}</p>
                        </div>`;
                    previewContainer.appendChild(div);
                };
                reader.readAsDataURL(file);
            });
        }
    });
}

// 3. TỈNH/THÀNH VÀ QUẬN/HUYỆN (Dùng open-api.vn)
function initLocationDropdowns() {
    const cityInput = document.getElementById('city');
    const cityDisplay = document.getElementById('city-display');
    const cityDropdown = document.getElementById('city-dropdown');
    const cityWrapper = document.getElementById('city-wrapper');
    
    const distInput = document.getElementById('district');
    const distDisplay = document.getElementById('district-display');
    const distDropdown = document.getElementById('district-dropdown');
    const distWrapper = document.getElementById('district-wrapper');

    fetch('https://provinces.open-api.vn/api/?depth=1').then(r => r.json()).then(provinces => {
        provinces.forEach(p => {
            const li = document.createElement('li');
            li.className = 'px-4 py-2.5 text-sm hover:bg-orange-50 cursor-pointer';
            li.innerText = p.name;
            li.onmousedown = () => {
                cityInput.value = p.name;
                cityDisplay.innerText = p.name;
                cityDisplay.classList.replace('text-slate-400', 'text-slate-800');
                cityDropdown.classList.add('hidden');
                
                // Load Quận
                distInput.value = '';
                distDisplay.innerText = 'Đang tải...';
                distWrapper.classList.remove('opacity-50', 'pointer-events-none');
                loadDistricts(p.code);
            };
            cityDropdown.appendChild(li);
        });
    });

    function loadDistricts(code) {
        fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`).then(r => r.json()).then(data => {
            distDropdown.innerHTML = '';
            distDisplay.innerText = 'Chọn Quận/Huyện';
            data.districts.forEach(d => {
                const li = document.createElement('li');
                li.className = 'px-4 py-2.5 text-sm hover:bg-orange-50 cursor-pointer';
                li.innerText = d.name;
                li.onmousedown = () => {
                    distInput.value = d.name;
                    distDisplay.innerText = d.name;
                    distDisplay.classList.replace('text-slate-400', 'text-slate-800');
                    distDropdown.classList.add('hidden');
                };
                distDropdown.appendChild(li);
            });
        });
    }

    cityWrapper.onclick = () => cityDropdown.classList.toggle('hidden');
    distWrapper.onclick = () => distDropdown.classList.toggle('hidden');
    
    document.addEventListener('click', (e) => {
        if (!cityWrapper.contains(e.target)) cityDropdown.classList.add('hidden');
        if (!distWrapper.contains(e.target)) distDropdown.classList.add('hidden');
    });
}

// 4. BẢN ĐỒ LEAFLET & GEOCODING
function initMapLogic() {
    let map = null, marker = null;

    function updateCoords(lat, lng) {
        document.getElementById('latitude').value  = lat.toFixed(8);
        document.getElementById('longitude').value = lng.toFixed(8);
        document.getElementById('latDisplay').innerText = lat.toFixed(6);
        document.getElementById('lngDisplay').innerText = lng.toFixed(6);
        document.getElementById('coordsDisplay').classList.replace('hidden', 'flex');
    }

    function renderMap(lat, lng) {
        document.getElementById('facilityMap').classList.remove('hidden');
        if (!map) {
            map = L.map('facilityMap').setView([lat, lng], 16);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
            marker = L.marker([lat, lng], { draggable: true }).addTo(map);
            marker.bindPopup('Kéo ghim để chỉnh chính xác').openPopup();

            marker.on('dragend', (e) => {
                const p = e.target.getLatLng();
                updateCoords(p.lat, p.lng);
            });
            map.on('click', (e) => {
                marker.setLatLng(e.latlng);
                updateCoords(e.latlng.lat, e.latlng.lng);
            });
        } else {
            map.setView([lat, lng], 16);
            marker.setLatLng([lat, lng]);
        }
        updateCoords(lat, lng);
        setTimeout(() => map.invalidateSize(), 150);
    }

    document.getElementById('geocodeBtn').addEventListener('click', async function() {
        const btn = this;
        const address = document.getElementById('address').value.trim();
        const city = document.getElementById('city').value;
        const dist = document.getElementById('district').value;

        if (!address || !city) {
            alert('Vui lòng điền địa chỉ và Tỉnh/Thành phố trước!');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">refresh</span> Đang tìm...';

        const query = `${address}, ${dist}, ${city}, Vietnam`;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
            const data = await res.json();
            
            if (data.length > 0) renderMap(parseFloat(data[0].lat), parseFloat(data[0].lon));
            else {
                alert('Không tìm ra tọa độ. Đang đưa về vị trí mặc định!');
                renderMap(10.762622, 106.660172); // HCM default
            }
        } catch(e) {
            alert('Lỗi dịch vụ bản đồ.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">my_location</span> Tìm vị trí';
        }
    });
}

// 5. VALIDATION & SUBMIT GỌI 2 API (TẠO CƠ SỞ -> UPLOAD ẢNH)
function initFormValidationAndSubmit() {
    const form = document.getElementById('createFacilityForm');
    const btn = document.getElementById('submitBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const openTime = document.getElementById('openTime').value;
        const closeTime = document.getElementById('closeTime').value;
        const city = document.getElementById('city').value;
        const lat = document.getElementById('latitude').value;

        if (!city) return alert("Vui lòng chọn Tỉnh/Thành phố");
        if (openTime >= closeTime) return alert("Giờ mở cửa phải trước giờ đóng cửa!");
        if (!lat) return alert("Vui lòng nhấn nút 'Tìm vị trí' trên bản đồ!");

        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">sync</span> Đang tạo...';

        try {
            // Bước 1: Gọi API Tạo Cơ sở
            const payload = {
                name: document.getElementById('name').value,
                description: document.getElementById('description').value,
                address: document.getElementById('address').value,
                city: city,
                district: document.getElementById('district').value,
                phone: document.getElementById('phone').value,
                email: document.getElementById('email').value,
                openTime: openTime,
                closeTime: closeTime,
                latitude: parseFloat(lat),
                longitude: parseFloat(document.getElementById('longitude').value)
            };

            const facRes = await fetch(`${BASE_URL}/facilities`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token') 
                },
                body: JSON.stringify(payload)
            });

            const facData = await facRes.json();
            if (!facData.success) throw new Error(facData.message);

            const newFacilityId = facData.data._id;

            // Bước 2: Upload Ảnh (nếu có chọn)
            const fileInput = document.getElementById('images');
            if (fileInput.files.length > 0) {
                btn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">cloud_upload</span> Đang up ảnh...';
                
                const formData = new FormData();
                Array.from(fileInput.files).forEach(file => formData.append('images', file));
                formData.append('setPrimary', 'true');

                const imgRes = await fetch(`${BASE_URL}/facilities/${newFacilityId}/images`, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                    body: formData // File tự động set Content-Type multipart/form-data
                });
                
                if (!imgRes.ok) console.warn("Lỗi upload ảnh, cơ sở đã tạo nhưng thiếu ảnh.");
            }

            showToast("Tạo cơ sở thành công!", true);
            setTimeout(() => window.location.href = 'list.html', 1500);

        } catch (err) {
            showToast(err.message || "Có lỗi xảy ra", false);
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined text-[20px] font-bold">add_circle</span> Thêm cơ sở';
        }
    });
}