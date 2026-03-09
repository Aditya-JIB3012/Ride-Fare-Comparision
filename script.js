// Popular Bangalore places for instant suggestions
const popularBangalorePlaces = [
    "Indiranagar",
    "Whitefield",
    "Koramangala",
    "Electronic City",
    "MG Road",
    "Jayanagar",
    "HSR Layout",
    "Marathahalli",
    "Hebbal",
    "Yelahanka",
    "Banashankari",
    "BTM Layout",
    "Rajajinagar",
    "Malleshwaram",
    "KR Puram",
    "Mathikere"
    ];

// Cache to store previous API results
const suggestionCache = {};

function getLocalMatches(query) {
    const lowerQuery = query.toLowerCase();

    return popularBangalorePlaces.filter(place =>
        place.toLowerCase().includes(lowerQuery)
    );
}


const pricingRules = {
    "namma-yatri": {
        bike: 8,
        auto: 12,
        cab: 18
    },
    "ola": {
        bike: 9,
        auto: 13,
        cab: 20
    },
    "rapido": {
        bike: 7,
        auto: 11,
        cab: 17
    },
    "uber": {
        bike: 10,
        auto: 15,
        cab: 22
    }
};

function calculateRideData(ratePerKm, distanceKm) {
    const baseFare = 25;
    const price = Math.round(baseFare + distanceKm * ratePerKm);
    const eta = Math.round(distanceKm * 2 + 4);

    return { price, eta };
}


async function getCoordinates(address) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=in`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.length === 0) {
        throw new Error("Location not found");
    }

    return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
    };
}

function calculateDistanceKm(coord1, coord2) {
    const R = 6371; // Earth radius in km

    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(coord1.lat * Math.PI / 180) *
        Math.cos(coord2.lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}


const checkPricesBtn = document.getElementById("checkPricesBtn");
const resultsSection = document.getElementById("results");

checkPricesBtn.addEventListener("click", async () => {
    let source = document.getElementById("source").value.trim();
    let destination = document.getElementById("destination").value.trim();

    source = normalizeLocationInput(source);
    destination = normalizeLocationInput(destination);

    if (!source || !destination) {
        alert("Please enter both source and destination");
        return;
    }

    try {
        const srcCoords = await getCoordinates(source);
        const dstCoords = await getCoordinates(destination);

        const distanceKm = calculateDistanceKm(srcCoords, dstCoords);
        window.currentDistance = distanceKm;

        console.log("Route distance:", distanceKm.toFixed(2), "km");

        document.getElementById("resultsTitle")
            .scrollIntoView({ behavior: "smooth" });

    } catch (err) {
        alert("Could not calculate distance. Try a clearer address.");
        console.error(err);
    }
});



const appCards = document.querySelectorAll(".app-card");
const backgroundWrapper = document.querySelector(".background-wrapper");

function applyTheme(app) {
    backgroundWrapper.classList.remove("ola-theme", "rapido-theme");

    if (app === "ola") {
        backgroundWrapper.classList.add("ola-theme");
    }

    if (app === "rapido") {
        backgroundWrapper.classList.add("rapido-theme");
    }
}

function clearTheme() {
    backgroundWrapper.classList.remove("ola-theme", "rapido-theme");
}

appCards.forEach(card => {

    // HOVER
    card.addEventListener("mouseenter", () => {
        applyTheme(card.dataset.app);
    });

    // LEAVE
    card.addEventListener("mouseleave", () => {
        if (!card.classList.contains("active")) {
            clearTheme();
        }
    });

    // CLICK
    card.addEventListener("click", () => {

        appCards.forEach(c => c.classList.remove("active"));
        card.classList.add("active");

        const app = card.dataset.app;

        applyTheme(app);

        // EXISTING PRICING LOGIC
        if (!window.currentDistance) {
            alert("Please enter source and destination first");
            return;
        }

        const rates = pricingRules[app];
        const distanceKm = window.currentDistance;

        const rideDataElements = card.querySelectorAll(".ride-data");

        rideDataElements.forEach(el => {
            const type = el.dataset.type;
            const { price, eta } =
                calculateRideData(rates[type], distanceKm);

            el.textContent = `₹${price} • ${eta} min`;
        });
    });

});


async function fetchSuggestions(query) {

    // 1️⃣ Check cache first
    if (suggestionCache[query]) {
        return suggestionCache[query];
    }

    // 2️⃣ Fetch from API
    const url = `https://nominatim.openstreetmap.org/search?format=json
        &q=${encodeURIComponent(query + ", Bengaluru")}
        &countrycodes=in
        &limit=5`;

    const response = await fetch(url.replace(/\s/g, ""));
    const data = await response.json();

    // 3️⃣ Store in cache
    suggestionCache[query] = data;

    return data;
}



function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

function setupAutocomplete(inputId, suggestionBoxId) {

    const input = document.getElementById(inputId);
    const box = document.getElementById(suggestionBoxId);

    let currentIndex = -1;

    function updateActive(items) {
        items.forEach(item =>
            item.classList.remove("suggestion-active")
        );

        if (items.length > 0 && items[currentIndex]) {
            items[currentIndex].classList.add("suggestion-active");

            // 👇 THIS FIXES AUTO SCROLL
            items[currentIndex].scrollIntoView({
                block: "nearest"
            });
        }
    }


    input.addEventListener("input", debounce(() => {
        const query = input.value.trim();
        box.innerHTML = "";
        currentIndex = -1;

        if (query.length < 3) return;

        fetchSuggestions(query)
            .then(results => {

                box.innerHTML = "";

                const localMatches = getLocalMatches(query);

                localMatches.forEach(place => {
                    const div = document.createElement("div");
                    div.classList.add("suggestion-item");

                    div.innerHTML = `
                        <div class="suggestion-main">${place}</div>
                        <div class="suggestion-sub">Bengaluru, Karnataka</div>
                    `;

                    div.onclick = () => {
                        input.value = place + ", Bengaluru, India";
                        box.innerHTML = "";
                    };

                    box.appendChild(div);
                });

                results.forEach(place => {

                    const mainName = place.display_name.split(",")[0];

                    if (!localMatches.includes(mainName)) {

                        const div = document.createElement("div");
                        div.classList.add("suggestion-item");

                        const parts = place.display_name.split(",");

                        div.innerHTML = `
                            <div class="suggestion-main">${parts[0]}</div>
                            <div class="suggestion-sub">${parts.slice(1, 3).join(",")}</div>
                        `;

                        div.onclick = () => {
                            input.value = place.display_name;
                            box.innerHTML = "";
                        };

                        box.appendChild(div);
                    }
                });

            })
            .catch(err => {
                console.error("Autocomplete error:", err);
            });

    }, 300));

    input.addEventListener("keydown", (e) => {

        const items = box.querySelectorAll(".suggestion-item");
        if (!items.length) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            currentIndex++;
            if (currentIndex >= items.length) currentIndex = 0;
            updateActive(items);
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            currentIndex--;
            if (currentIndex < 0) currentIndex = items.length - 1;
            updateActive(items);
        }

        if (e.key === "Enter") {
            e.preventDefault();
            if (currentIndex >= 0) {
                items[currentIndex].click();
                currentIndex = -1;
            }
        }
    });

    document.addEventListener("click", e => {
        if (!box.contains(e.target) && e.target !== input) {
            box.innerHTML = "";
        }
    });
}

setupAutocomplete("source", "sourceSuggestions");
setupAutocomplete("destination", "destinationSuggestions");

function normalizeLocationInput(input) {
    const lower = input.toLowerCase();

    // If user already typed city/country, trust it
    if (lower.includes("india") || lower.includes("bangalore")) {
        return input;
    }

    // Otherwise, auto-append default city + country
    return `${input}, Bangalore, India`;
}
