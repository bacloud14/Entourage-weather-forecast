// import * as helpers from "./helpers";
// 0 /////////////////////////////////////////////////////////////////////////////////////
const dotenv = require('dotenv');
dotenv.config();
console.log(`Your port is ${process.env.NODE_PORT}`); // 8626
const express = require('express');
const helmet = require("helmet");
const axios = require('axios');
const redis = require('redis');
const nearbyCities = require("nearby-cities");
var weather = require('openweather-apis');
weather.setLang('en');
const app = express();
app.use(helmet({contentSecurityPolicy: false}));
const nodePort = process.env.NODE_PORT;
const redisPort = process.env.REDIS_PORT;
const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;

app.listen(nodePort, () => {
    console.log(`Server running on port ${nodePort}`);
});
app.use(express.static(__dirname + "/"));
app.get('/hometown/', (req, res) => {
    res.redirect("/hometown.html");
});
// make a connection to the local instance of redis
const client = redis.createClient(redisPort);
client.on("error", (error) => {
    console.error(error);
});

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

// 2 /////////////////////////////////////////////////////////////////////////////////////
// get data from openweathermap API 
async function fetchWeather(city) {
    return new Promise(async (resolve, reject) => {
        API_Url = `https://api.openweathermap.org/data/2.5/onecall?lat=${city["lat"]}&lon=${city["lon"]}&exclude=hourly,minutely,hourly&units=metric&appid=${OPENWEATHERMAP_API_KEY}`;
        const body = await axios.get(API_Url);
        const data = await body.data;
        resolve(data);
    });

}

// 3 /////////////////////////////////////////////////////////////////////////////////////
app.get('/nearby/:city', (req, res) => {
    try {
        var geometry = JSON.parse(req.params.city);
        var cityname = geometry.cityname;
        // Check the redis store for the data first
        client.get(cityname, async (err, result) => {
            if (result) {
                return res.status(200).send({
                    error: false,
                    message: `Weather data for nearby cities for ${cityname} from the cache`,
                    data: JSON.parse(result)
                })
            } else {
                const query = {
                    latitude: geometry.lat,
                    longitude: geometry.lng
                };
                var cities = nearbyCities(query).slice(0, 10);
                var actions = cities.map(fetchWeather)
                Promise.all(actions).then(function (weathers) {
                    // console.log(weathers[0].daily)
                    var result = formatCities(cities, weathers);
                    client.setex(cityname, 1440, JSON.stringify(result));
                    return res.status(200).send({
                        error: false,
                        message: `Weather data for nearby cities from the server`,
                        data: result
                    });
                });
            }
        });

    } catch (error) {
        console.log(error)
    }

});

// 4 /////////////////////////////////////////////////////////////////////////////////////
function formatCities(cities, weathers) {
    var newVar = {
        "type": "FeatureCollection",
        "features": [],
        "weather": []
    };
    cities.forEach(function (city, index) {
        var feature = {
            "cityid": getCityId({ lon: city["lon"], lat: city["lat"] }),
            "geometry": {
                "type": "Point",
                "coordinates": [city["lon"], city["lat"]]
            },
            "type": "Feature",
            "properties": {
                "category": "patisserie",
                "hours": "10am - 6pm",
                "description": "Modern twists on classic pastries. We're part of a larger chain of patisseries and cafes.",
                "name": city.name,
                "phone": "+44 20 1234 5678",
                "storeid": "01"
            }
        };
        newVar.features.push(feature);
        weathers[index]['cityName'] = city.name;
    });
    
    newVar.weather = weathers;
    return newVar;
}

module.exports = app;