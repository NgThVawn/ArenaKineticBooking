const BASE_URL = 'http://localhost:3000/api/v1';

async function apiRegister(data) {
    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return response.json();
}

async function apiLogin(data) {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }); 
    return response.json();
}
// hàm lấy danh sách sân
async function apiGetFacilities() {
    const response = await fetch(`${BASE_URL}/facilities`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
}