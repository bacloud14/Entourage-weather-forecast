const express = require('express');
const axios = require('axios');
const redis = require('redis');

const reverse = require('reverse-geocode');
const nearbyCities = require("nearby-cities");
var weather = require('openweather-apis');
weather.setLang('en');

const app = express();

const port = 3000;

// make a connection to the local instance of redis
// const client = redis.createClient(6379);

// client.on("error", (error) => {
//  console.error(error);
// });

app.use(express.static(__dirname + "/"));

app.get('/hometown/', (req, res) => {
    res.redirect("/hometown.html");
});


app.get('/nearby/:city', (req, res) => {
    var geometry = JSON.parse(req.params.city);
    const query = {
        latitude: geometry.lat,
        longitude: geometry.lng
    };

    var cities = nearbyCities(query).slice(0, 10);
    var actions = cities.map(formatCity)
    Promise.all(actions).then(function (weathers) {
        // console.log(weathers[0].daily)
        var result = formatCities(cities, weathers)
        return res.status(200).send({
            error: false,
            message: `Recipe for nearby cities from the server`,
            data: result
        });
    });

});

app.get('/recipe/:fooditem', (req, res) => {
    try {
        const foodItem = req.params.fooditem;

        // Check the redis store for the data first
        client.get(foodItem, async (err, recipe) => {
            if (recipe) {
                return res.status(200).send({
                    error: false,
                    message: `Recipe for ${foodItem} from the cache`,
                    data: JSON.parse(recipe)
                })
            } else { // When the data is not found in the cache then we can make request to the server

                const recipe = await axios.get(`http://www.recipepuppy.com/api/?q=${foodItem}`);

                // save the record in the cache for subsequent request
                client.setex(foodItem, 1440, JSON.stringify(recipe.data.results));

                // return the result to the client
                return res.status(200).send({
                    error: false,
                    message: `Recipe for ${foodItem} from the server`,
                    data: recipe.data.results
                });
            }
        })
    } catch (error) {
        console.log(error)
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

function formatCities(cities, weathers) {
    var newVar = {
        "type": "FeatureCollection",
        "features": [],
        "weather": []
    };
    cities.forEach(function (city, index) {
        var feature = {
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

async function formatCity(city) {
    return new Promise(async (resolve, reject) => {
        API_Url = 'https://api.openweathermap.org/data/2.5/onecall?lat='+city["lat"]+'&lon='+city["lon"]+'&exclude=hourly,minutely,hourly&units=metric&appid=YOUR_OPENWEATHERMAP_API_KEY';
        const body = await axios.get(API_Url);
        const data = await body.data;
        resolve(data);
    });

}


module.exports = app;