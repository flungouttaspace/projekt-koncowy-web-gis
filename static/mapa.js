async function uruchomMape() {
    const komunikat = document.getElementById('komunikat');
    if (!window.L) {
        komunikat.textContent = 'Nie wczytano Leaflet. Sprawdź internet.';
        return;
    }

    const odpowiedz = await fetch('/static/data/granica.geojson');
    if (!odpowiedz.ok) {
        throw new Error('Nie można odczytać granicy województwa.');
    }
    const granica = await odpowiedz.json();
    const mapa = L.map('mapa', {minZoom: 7, maxZoom: 18});
    const zasieg = L.geoJSON(granica).getBounds();
    mapa.fitBounds(zasieg);
    mapa.setMaxBounds(zasieg);
    L.control.scale({imperial: false}).addTo(mapa);

    const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        bounds: zasieg,
        noWrap: true,
        zIndex: 1,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    const adresOrto = 'https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMTS/StandardResolution';
    const orto = L.tileLayer(adresOrto + '?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0'
        + '&LAYER=ORTOFOTOMAPA&STYLE=default&FORMAT=image/jpeg'
        + '&TILEMATRIXSET=EPSG:3857&TILEMATRIX=EPSG:3857:{z}'
        + '&TILEROW={y}&TILECOL={x}', {
        bounds: zasieg,
        noWrap: true,
        opacity: 0.7,
        zIndex: 2,
        attribution: 'Ortofotomapa: GUGiK'
    });
    const adresNmt = 'https://mapy.geoportal.gov.pl/wss/service/PZGIK/NMT/GRID1/WMS/ShadedRelief';
    const nmt = L.tileLayer.wms(adresNmt, {
        layers: 'Raster',
        format: 'image/png',
        transparent: true,
        bounds: zasieg,
        noWrap: true,
        opacity: 0.55,
        zIndex: 3,
        attribution: 'NMT: GUGiK'
    });
    const messtischblatt = L.tileLayer('https://www.susudata.de/tk25/tiles/{z}/{x}/{y}', {
        tms: true,
        maxNativeZoom: 16,
        maxZoom: 18,
        bounds: zasieg,
        noWrap: true,
        opacity: 0.7,
        zIndex: 4,
        attribution: 'Messtischblatt: <a href="https://www.susudata.de/messtisch/tk25.html">Susudata</a> · <a href="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0</a>'
    });
    osm.addTo(mapa);

    // Pierwszy pierścień pokrywa świat, pozostałe wycinają województwo.
    const maska = [[[-85, -180], [-85, 180], [85, 180], [85, -180]]];
    for (const wielokat of granica.geometry.coordinates) {
        for (const pierscien of wielokat) {
            const punkty = [];
            for (const punkt of pierscien) {
                punkty.push([punkt[1], punkt[0]]);
            }
            maska.push(punkty);
        }
    }
    L.polygon(maska, {
        stroke: false, fillColor: '#eeeeee', fillOpacity: 1,
        fillRule: 'evenodd', interactive: false
    }).addTo(mapa);
    L.geoJSON(granica, {
        style: {color: '#336633', weight: 2, fill: false},
        interactive: false
    }).addTo(mapa);

    function polaczPola(nazwa, warstwa) {
        const pole = document.getElementById(nazwa);
        const suwak = document.getElementById(nazwa + '-krycie');
        const wartosc = document.getElementById(nazwa + '-wartosc');
        pole.addEventListener('change', function () {
            if (pole.checked) {
                warstwa.addTo(mapa);
            } else {
                mapa.removeLayer(warstwa);
            }
        });
        suwak.addEventListener('input', function () {
            wartosc.textContent = suwak.value;
            warstwa.setOpacity(Number(suwak.value) / 100);
        });
        warstwa.on('tileerror', function () {
            komunikat.textContent = 'Nie pobrano części mapy: ' + nazwa
                + '. Wyłącz i włącz warstwę, aby spróbować ponownie.';
        });
    }
    polaczPola('osm', osm);
    polaczPola('orto', orto);
    polaczPola('nmt', nmt);
    polaczPola('messtischblatt', messtischblatt);

    const przycisk = document.getElementById('region');
    przycisk.disabled = false;
    przycisk.addEventListener('click', function () {
        mapa.fitBounds(zasieg);
    });
    document.getElementById('szczecin').addEventListener('click', function () {
        mapa.setView([53.4285, 14.5528], 13);
    });
    document.getElementById('szczecin').disabled = false;
    komunikat.textContent = 'Mapa gotowa. Włącz wybrane warstwy.';
}

uruchomMape().catch(function () {
    document.getElementById('komunikat').textContent = 'Błąd uruchomienia mapy. Odśwież stronę i sprawdź internet.';
});
