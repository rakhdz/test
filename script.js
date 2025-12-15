let map, locationMap, userLat, userLng, funerals = JSON.parse(localStorage.getItem('funerals')) || [];
let mapInitialized = false, locationMapInitialized = false;
let cachedLocation = JSON.parse(localStorage.getItem('cachedLocation')) || null;
let locationCacheTime = localStorage.getItem('locationCacheTime');

// GPS فائق الخفة - استخدام cache لمدة ساعة كاملة
function getUltraLightGPS() {
    const now = Date.now();
    const cacheValid = locationCacheTime && (now - parseInt(locationCacheTime)) < 3600000; // ساعة
    
    if (cachedLocation && cacheValid) {
        userLat = cachedLocation.lat;
        userLng = cachedLocation.lng;
        showGPSStatus('جاهز (من الذاكرة المؤقتة)', 'gps-ready');
        return Promise.resolve(cachedLocation);
    }

    return new Promise((resolve, reject) => {
        showGPSStatus('جاري تحديد الموقع...', 'gps-loading');
        
        navigator.geolocation.getCurrentPosition(
            position => {
                userLat = position.coords.latitude;
                userLng = position.coords.longitude;
                
                // حفظ في الـcache لساعة
                cachedLocation = { lat: userLat, lng: userLng };
                localStorage.setItem('cachedLocation', JSON.stringify(cachedLocation));
                localStorage.setItem('locationCacheTime', Date.now().toString());
                
                showGPSStatus('✅ جاهز بدقة عالية', 'gps-ready');
                resolve({ lat: userLat, lng: userLng });
            },
            () => {
                // fallback للرياض إذا فشل GPS
                userLat = 24.7136;
                userLng = 46.6753;
                showGPSStatus('تم استخدام موقع افتراضي (الرياض)', 'gps-ready');
                resolve({ lat: userLat, lng: userLng });
            },
            { 
                enableHighAccuracy: false,  // إيقاف الدقة العالية لتوفير البطارية
                timeout: 5000,              // 5 ثواني فقط
                maximumAge: 3600000         // ساعة كاملة cache
            }
        );
    });
}

function showGPSStatus(message, className) {
    const status = document.getElementById('gpsStatus');
    status.textContent = message;
    status.className = `gps-status ${className}`;
    status.style.display = 'block';
    setTimeout(() => status.style.display = 'none', 3000);
}

// إظهار قسم معين
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
    
    if (sectionId === 'mapSection' && !mapInitialized) {
        initMap();
        mapInitialized = true;
    }
}

// إظهار خريطة تحديد الموقع
async function showLocationMap() {
    document.getElementById('locationSection').classList.add('active');
    
    await getUltraLightGPS();
    
    if (!locationMapInitialized) {
        initLocationMap();
        locationMapInitialized = true;
    } else {
        locationMap.setView([userLat, userLng], 15);
    }
}

// إخفاء خريطة تحديد الموقع
function hideLocationMap() {
    document.getElementById('locationSection').classList.remove('active');
}

// تهيئة خريطة تحديد الموقع
function initLocationMap() {
    locationMap = L.map('locationMap').setView([userLat, userLng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18
    }).addTo(locationMap);
    
    L.marker([userLat, userLng]).addTo(locationMap)
        .bindPopup('موقعك الحالي (مؤقت)').openPopup();
    
    // النقر على الخريطة لاختيار موقع
    locationMap.on('click', function(e) {
        userLat = e.latlng.lat;
        userLng = e.latlng.lng;
        locationMap.eachLayer(layer => {
            if (layer instanceof L.Marker) locationMap.removeLayer(layer);
        });
        L.marker([userLat, userLng]).addTo(locationMap)
            .bindPopup('✅ الموقع المحدد لبيت المتوفى').openPopup();
    });
}

// تأكيد الموقع
function confirmLocation() {
    document.getElementById('locationDisplay').value = 
        `تم تحديد الموقع: ${userLat.toFixed(6)}, ${userLng.toFixed(6)}`;
    hideLocationMap();
}

// نشر الجنازة
function publishFuneral() {
    const name = document.getElementById('deceasedName').value;
    const time = document.getElementById('prayerTime').value;
    const mosque = document.getElementById('mosqueName').value;
    
    if (!name || !time || !mosque || !userLat) {
        alert('❌ يرجى ملء جميع البيانات وتحديد الموقع أولاً');
        return;
    }

    const funeral = {
        id: Date.now(),
        name: name,
        time: time,
        mosque: mosque,
        lat: userLat,
        lng: userLng,
        date: new Date().toLocaleDateString('ar-SA'),
        timePublished: new Date().toLocaleTimeString('ar-SA')
    };
    
    funerals.unshift(funeral);
    localStorage.setItem('funerals', JSON.stringify(funerals));
    
    alert('✅ تم نشر الجنازة بنجاح!');
    document.getElementById('addForm').querySelectorAll('input').forEach(input => input.value = '');
    document.getElementById('locationDisplay').value = '';
    userLat = null;
    userLng = null;
    showSection('mapSection');
}

// تهيئة الخريطة الرئيسية
async function initMap() {
    await getUltraLightGPS();
    map = L.map('map').setView([userLat || 24.7136, userLng || 46.6753], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    addFuneralsToMap();
    showFuneralsList();
}

function addFuneralsToMap() {
    funerals.forEach(funeral => {
        L.marker([funeral.lat, funeral.lng])
            .addTo(map)
            .bindPopup(`
                <b>${funeral.name}</b><br>
                <i class="fas fa-mosque"></i> المسجد: ${funeral.mosque}<br>
                <i class="fas fa-calendar"></i> التاريخ: ${funeral.date}<br>
                <i class="fas fa-clock"></i> الوقت: ${new Date(funeral.time).toLocaleTimeString('ar-SA')}<br>
                نشرت: ${funeral.timePublished}
            `);
    });
}

function showFuneralsList() {
    const list = document.getElementById('funeralsList');
    if (funerals.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#a0a0b0;">لا توجد جنائز حالياً</p>';
        return;
    }
    list.innerHTML = funerals.map(f => `
        <div style="background:rgba(255,255,255,0.1); padding:15px; margin:10px 0; border-radius:10px; border-right:4px solid #00d4aa;">
            <h4>${f.name}</h4>
            <p><i class="fas fa-mosque"></i> ${f.mosque}</p>
            <p><i class="fas fa-calendar"></i> ${f.date}</p>
            <p><i class="fas fa-clock"></i> ${new Date(f.time).toLocaleTimeString('ar-SA')}</p>
        </div>
    `).join('');
}

function refreshMap() {
    if (map) {
        map.eachLayer(layer => {
            if (layer instanceof L.Marker) map.removeLayer(layer);
        });
        addFuneralsToMap();
    }
    showFuneralsList();
}

async function centerUser() {
    await getUltraLightGPS();
    if (map && userLat) {
        map.setView([userLat, userLng], 15);
    }
}
