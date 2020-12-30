// 1 /////////////////////////////////////////////////////////////////////////////////////
const fs = require('fs');
let rawdata = fs.readFileSync('city.list.min.json');
let citiesIds = JSON.parse(rawdata);
function getCityId(coord) {
    // return undefined;
    toPrecision = x => Number.parseFloat(x).toPrecision(3)
    coord.lon = toPrecision(coord.lon);
    coord.lat = toPrecision(coord.lat);
    onecity = citiesIds.filter((item) => {
        lon = toPrecision(item.coord.lon);
        lat = toPrecision(item.coord.lat);
        return lon == coord.lon && lat == coord.lat;
    })[0]
    if (onecity) {
        return onecity.id;
    } else {
        console.log("getCityId called: \n city not found :(");
        return undefined;
    }
}