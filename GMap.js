// This sample uses the Place Autocomplete widget to allow the user to search
// for and select a place. The sample then displays an info window containing
// the place ID and other information about the place that the user has
// selected.
// This example requires the Places library. Include the libraries=places
// parameter when you first load the API. For example:
// <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places">
var currentPlace;
var map;
var currentList;
var markers;

function initMap() {

    // Instanciate a map. For first visit, there is no search yet and as a result no center, thus we take the default. (lat: -33.8688,lng: 151.2195)
    center = undefined;
    if (currentList && currentList["features"] && currentList.features.length > 0) {
        coordinates = currentList.features[0].geometry.coordinates;
        center = {
            lat: coordinates[1],
            lng: coordinates[0]
        }
    }

    if (!map) {
        map = new google.maps.Map(document.getElementById("map"), {
            center: center || {
                lat: -33.8688,
                lng: 151.2195
            },
            zoom: 13,
        });
    } else {
        (function (m) {
            m.data.forEach(function (f) {
                m.data.remove(f);
            });
        }(map))
        google.maps.event.trigger(map, 'resize');
    }

    // less styling, setting business positions off and transit off
    const styles = {
        default: [],
        hide: [
            {
                featureType: "poi.business",
                stylers: [{ visibility: "off" }],
            },
            {
                featureType: "transit",
                elementType: "labels.icon",
                stylers: [{ visibility: "off" }],
            },
        ]
    };
    var d = new Date();
    var n = d.getHours();
    if (n > 18 || n < 6) {
        styles['night'] = [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
            {
                featureType: "administrative.locality",
                elementType: "labels.text.fill",
                stylers: [{ color: "#d59563" }],
            },
            {
                featureType: "poi",
                elementType: "labels.text.fill",
                stylers: [{ color: "#d59563" }],
            },
            {
                featureType: "poi.park",
                elementType: "geometry",
                stylers: [{ color: "#263c3f" }],
            },
            {
                featureType: "poi.park",
                elementType: "labels.text.fill",
                stylers: [{ color: "#6b9a76" }],
            },
            {
                featureType: "road",
                elementType: "geometry",
                stylers: [{ color: "#38414e" }],
            },
            {
                featureType: "road",
                elementType: "geometry.stroke",
                stylers: [{ color: "#212a37" }],
            },
            {
                featureType: "road",
                elementType: "labels.text.fill",
                stylers: [{ color: "#9ca5b3" }],
            },
            {
                featureType: "road.highway",
                elementType: "geometry",
                stylers: [{ color: "#746855" }],
            },
            {
                featureType: "road.highway",
                elementType: "geometry.stroke",
                stylers: [{ color: "#1f2835" }],
            },
            {
                featureType: "road.highway",
                elementType: "labels.text.fill",
                stylers: [{ color: "#f3d19c" }],
            },
            {
                featureType: "transit",
                elementType: "geometry",
                stylers: [{ color: "#2f3948" }],
            },
            {
                featureType: "transit.station",
                elementType: "labels.text.fill",
                stylers: [{ color: "#d59563" }],
            },
            {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#17263c" }],
            },
            {
                featureType: "water",
                elementType: "labels.text.fill",
                stylers: [{ color: "#515c6d" }],
            },
            {
                featureType: "water",
                elementType: "labels.text.stroke",
                stylers: [{ color: "#17263c" }],
            },
            {
                featureType: "poi.business",
                stylers: [{ visibility: "off" }],
            },
            {
                featureType: "transit",
                elementType: "labels.icon",
                stylers: [{ visibility: "off" }],
            },
        ];
    }
    map.setOptions({ styles: styles["night"] || styles["hide"] });

    // Populate current list of cities nearby on the map
    if (currentList && currentList["features"] && currentList.features.length > 0) {
        map.data.addGeoJson(currentList);
        markers = getMarkers();
        clearMarkers();
        showMarkers();
        map.data.setStyle({
            strokeColor: "blue"
        });
        // Fit map size to its markers
        var bounds = new google.maps.LatLngBounds();
        map.data.forEach(function (feature) {
            feature.getGeometry().forEachLatLng(function (latlng) {
                bounds.extend(latlng);
            });
        });
        map.fitBounds(bounds);
        map.setCenter(center)
    }
    // initMarkers();
    // Create the autocompletion search bar
    var input = document.getElementById("pac-input");
    if (input == null) {
        let div = document.createElement("INPUT");
        div.id = "pac-input";
        div.className = "controls";
        div.type = "text";
        div.placeholder = "Enter a location";
        document.body.appendChild(div);
        input = document.getElementById("pac-input");
    }
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo("bounds", map);
    // Specify just the place data fields that you need.
    autocomplete.setFields(["place_id", "geometry", "name"]);
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(input);
    const infowindow = new google.maps.InfoWindow();
    const infowindowContent = document.getElementById("infowindow-content");
    infowindow.setContent(infowindowContent);
    const marker = new google.maps.Marker({
        map: map
    });
    // marker.onclick action: populate the city marker clicked on the HTML cards (renderForecastDays)
    if (markers && markers.length > 0)
        markers.forEach(marker => {
            marker.addListener("click", () => {
                console.log(marker.title)
                infowindow.open(map, marker);
                if (currentList && currentList["features"] && currentList.features.length > 0) {
                    document.getElementById('location').innerHTML = marker.title; //currentList.features[0].properties.name;
                    cityWeather = currentList.weather.filter((item) => {
                        return (item.cityName == marker.title);
                    })[0]
                    renderForecastDays(cityWeather.daily);
                }
            });
        });

    // A possible second search (although not well managed and buggy, now) 
    autocomplete.addListener("place_changed", () => {
        markers = getMarkers();
        if (markers.length > 0)
            clearMarkers();
        infowindow.close();
        const place = autocomplete.getPlace();

        if (!place.geometry) {
            return;
        }

        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(13);
        }

        // Set the position of the marker using the place ID and location.
        marker.setPlace({
            placeId: place.place_id,
            location: place.geometry.location,
        });
        marker.setVisible(true);
        infowindowContent.children.namedItem("place-name").textContent = place.name;
        infowindowContent.children.namedItem("place-id").textContent =
            place.place_id;
        infowindowContent.children.namedItem("place-address").textContent =
            place.formatted_address;
        infowindow.open(map, marker);
        currentPlace = place;
        getPicture(place.name);
        nearbyRequest(place);
    });

    var panButton = document.getElementsByClassName("custom-map-control-button")[0];
    if (panButton)
        return;
    infoWindow = new google.maps.InfoWindow();
    const locationButton = document.createElement("button");
    locationButton.textContent = "Go to Current Location";
    locationButton.classList.add("custom-map-control-button");
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(locationButton);
    locationButton.addEventListener("click", () => {
        // Try HTML5 geolocation.
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    infoWindow.setPosition(pos);
                    infoWindow.setContent("Location found.");
                    infoWindow.open(map);
                    map.setCenter(pos);
                },
                () => {
                    handleLocationError(true, infoWindow, map.getCenter());
                }
            );
        } else {
            // Browser doesn't support Geolocation
            handleLocationError(false, infoWindow, map.getCenter());
        }
    });

    // Populate current list of cities on a floating HTML panel on the map
    // showplacesList(currentList);

}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(
        browserHasGeolocation
            ? "Error: The Geolocation service failed."
            : "Error: Your browser doesn't support geolocation."
    );
    infoWindow.open(map);
}


// Create an AJAX request for one place this is called once the user search for a city. "nearby/" is the main API in back-end
function nearbyRequest(place) {
    let request = new XMLHttpRequest();
    requestObject = JSON.stringify({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        cityname: place.name
    });
    request.open('GET', "nearby/" + requestObject);
    request.responseType = 'json';
    request.onload = function () {
        currentList = request.response.data;
        document.getElementById('location').innerHTML = currentList.features[0].properties.name;
        renderForecastDays(currentList.weather[0].daily);
        initMap();
        generateWidgetLink();
    };
    request.send();
}

// Creates an HTML panel which is a list of current cities
function showplacesList( /*data,*/ places) {
    if (!places || places.length == 0) {
        console.log('empty places');
        return;
    }
    let panel = document.createElement('ul');
    // If the panel already exists, use it. Else, create it and add to the page.
    if (document.getElementById('panel')) {
        panel = document.getElementById('panel');
        // If panel is already open, close it
        if (panel.classList.contains('open')) {
            panel.classList.remove('open');
        }
    } else {
        panel.setAttribute('id', 'panel');
        const body = document.body;
        body.insertBefore(panel, body.childNodes[0]);
    }

    // Clear the previous details
    while (panel.lastChild) {
        panel.removeChild(panel.lastChild);
    }

    places.features.forEach((place) => {
        // Add place details with text formatting
        const name = document.createElement('li');
        name.classList.add('place');
        // const currentplace = data.getFeatureById(place.placeid);
        name.textContent = place.properties.name; //currentplace.getProperty('name');
        panel.appendChild(name);
        // const distanceText = document.createElement('p');
        // distanceText.classList.add('distanceText');
        // distanceText.textContent = place.distanceText;
        // panel.appendChild(distanceText);
    });
    // Open the panel
    panel.classList.add('open');
    return;
}

// Creates and Updates the HTML list of cards which is a list of weather information for one city in a week
function renderForecastDays(dailies) {
    // console.log("renderForecastDays");
    // console.log(JSON.stringify(dailies));
    dailies.reverse();

    const weekdayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
    ];
    document.getElementById('forecast-items').innerHTML = "";
    document.body.style.backgroundImage = `url(http://openweathermap.org/img/wn/${dailies[dailies.length - 1].weather[0].icon || 'na'}.png)`;
    var maxTemp = Math.max(... dailies.map((item) => { return item.temp.max; }));
    console.log(maxTemp);
    dailies.forEach(function (period, idx) {
        var d = new Date(0);
        d.setUTCSeconds(period.dt);
        var ISODate = d.toISOString().slice(0, 10);
        const dayName = weekdayNames[d.getDay()]; // new Date(period.dateTimeISO).getDay()
        const iconSrc = `http://openweathermap.org/img/wn/${period.weather[0].icon || 'na'}@4x.png`;
        const maxTempF = period.temp.max || 'N/A';
        const minTempF = period.temp.min || 'N/A';
        const weather = period.weather[0].description || 'N/A';
        var h = (1.0 - (maxTempF/maxTemp)) * 240;
        var hueColor = "hsl(" + h + ", 100%, 50%)";
        var hueColor = "; background-color: "+hueColor;
        const template = (`
            <div class="card" style="width: 20%${hueColor}">
                <div class="card-body">
                    <h4 class="card-title text-center">${dayName}</h4>
                    <h5 class="card-title text-center">${ISODate}</h5>
                    <p><img class="card-img mx-auto d-block" style="max-width: 100px;" src="${iconSrc}"></p>
                    <h6 class="card-title text-center">${weather}</h6>
                    <p class="card-text text-center">High: ${maxTempF} Low: ${minTempF}</p>
                </div>
            </div>
        `);

        document.getElementById('forecast-items').insertAdjacentHTML('afterbegin', template);
    });
}

// #getMarkers, #setMapOnAll, #clearMarkers, #showMarkers are helpers to refresh markers. 
// Detach old features then attach new markers to map
function getMarkers() {
    if (!currentList)
        return false;
    coordinates = currentList.features[0].geometry.coordinates;
    center = {
        lat: coordinates[1],
        lng: coordinates[0]
    };
    var bounds = new google.maps.LatLngBounds(),
        markers = [];

    map.data.forEach(function (feature) {
        // if (feature.getGeometry().getType() === 'Polygon') {
        //     feature.getGeometry().forEachLatLng(function(latlng) {
        //         bounds.extend(latlng);
        //     });
        // } else 
        if (feature.getGeometry().getType() === 'Point') {
            var LatLng = feature.getGeometry().get(),
                marker = new google.maps.Marker({
                    position: LatLng,
                    map: map,
                    title: feature.j.name
                });
            markers.push(marker);
            // remove previous markers from map.data
            map.data.remove(feature);
        }
    });
    return markers;
}
// Sets the map on all markers in the array.
function setMapOnAll(map) {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
    }
}
// Removes the markers from the map, but keeps them in the array.
function clearMarkers() {
    setMapOnAll(null);
}
// Shows any markers currently in the array.
function showMarkers() {
    setMapOnAll(map);
}

// Generates a link with cityid for searched city (not surrounding ones). The link opens "openweatherwidget" which is an openweathermap "widget"
function generateWidgetLink() {
    if (currentList) {
        document.getElementById("widget").href = "openweatherwidget.html?cityid=" + currentList.features[0].cityid;
        $("#widget").toggleClass('disabled active')
    }
}

function getPicture(place) {
    var service = new google.maps.places.PlacesService(map);
    var request = {
        location: map.getCenter(),
        radius: '500',
        query: place
    };
    service.textSearch(request, callback);
    // Checks that the PlacesServiceStatus is OK, and adds a marker
    // using the place ID and location from the PlacesService.
    function callback(results, status) {
        if (status == google.maps.places.PlacesServiceStatus.OK) {
            if (results[0].photos[0]) {
                document.getElementById("featured_picture").style = "background-size: contain; background-repeat: no-repeat; background-position: center;"
                document.getElementById("featured_picture").style.backgroundImage = "url('" + results[0].photos[0].getUrl() + "')";
                // document.getElementById("featured_picture").style.background = "center"; 
            }
        }
    }
}