
// Since there's only one form on the page, we know 
// it will be the first (#0) form.
const theForm = document.forms.item(0);

const elcRoot = "https://data.wsdot.wa.gov/arcgis/rest/services/Shared/ElcRestSOE/MapServer/exts/ElcRestSoe"
const routesUrl = `${elcRoot}/routes?f=json`;
const findRouteLocationsUrl = `${elcRoot}/Find%20Route%20Locations`;
const regionQueryUrl = "https://data.wsdot.wa.gov/arcgis/rest/services/Shared/RegionBoundaries/MapServer/0/query";

/**
 * Checks an object to see if it has an "x" and "y" property,
 * which means it is a point.
 * @param {*} geometry 
 * @returns {boolean}
 */
function objectIsPoint(geometry) {
    return geometry.hasOwnProperty("x") && geometry.hasOwnProperty("y");
}

async function getCountyForRouteGeometry(routeGeometry) {
    const countyQueryUrl = "https://data.wsdot.wa.gov/arcgis/rest/services/Shared/CountyBoundaries/MapServer/0/query";
    const countyNameField = "JURLBL";

    const params = new URLSearchParams();
    params.set("outFields", countyNameField);
    params.set("returnGeometry", false);
    params.set("f", "json");

    const isPoint = objectIsPoint(routeGeometry);

    params.set("inSR", routeGeometry.spatialReference.wkid);
    delete routeGeometry.spatialReference;
    const geometryType = `esriGeometry${isPoint ? "Point" : "Polyline"}`;
    params.set("geometry", JSON.stringify(routeGeometry));
    params.set("geometryType", geometryType);
    params.set("spatialRel", `esriSpatialRel${isPoint ? "Within" : "Intersects"}`);

    const queryResults = await fetch(countyQueryUrl, {
        body: params.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        method: "POST"
    }).then(qr => qr.json());

    console.debug("county query results", queryResults);

    const outputSet = new Set();

    const features = queryResults.features;

    for (const feature of features) {
        const county = feature.attributes[countyNameField];
        outputSet.add(county);
    }

    return outputSet;
}

// Create event handler for form submit event.
theForm.addEventListener("submit", function (e) {

    try {
        /**
         * @type {string}
         */
        const route = document.getElementById("routeSelector").value
        /** @type {number} */
        const srmp1 = document.getElementById("srmp1").valueAsNumber;
        /** @type {?number} */
        let srmp2 = document.getElementById("srmp2").valueAsNumber;

        const isDecrease = document.getElementById("decreaseCheckbox").checked;

        const now = new Date;

        const referenceDate = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()}`

        const location = {
            Route: route,
            Srmp: srmp1,
            EndSrmp: srmp2,
            Decrease: isDecrease
        };

        console.log("location", location);


        const elcUrl = new URL(findRouteLocationsUrl)
        const elcParams = elcUrl.searchParams;
        elcParams.set("f", "json");
        elcParams.set("referenceDate", referenceDate);
        elcParams.set("locations", JSON.stringify([location]));

        fetch(elcUrl.toString()).then(r => r.json()).then(response => {

            console.log("elc response", response);

            const location = response[0];
            const geometry = location.RouteGeometry;
            delete geometry.__type;

            console.log("geometry", geometry);

            getCountyForRouteGeometry(geometry).then(counties => {
                console.debug("counties", counties);
                const countyBox = document.getElementById("countyBox");
                countyBox.value = new Array(...counties).join(",");
            });



            // TODO: query map service layers to see which features intersect the geometry.
        });

        // const routeLocations = routeLocator.findRouteLocations({
        //     // Set reference date to current date.
        //     locations: [
        //         location
        //     ]
        // });

    }
    catch (err) {
        console.error(err);
    }
    finally {

        // Stop the default behavior which would reload the page.
        e.preventDefault();
    }


});

fetch(routesUrl).then(routesResponse => routesResponse.json()).then(routesResponse => {
    // Get the list of routes for the current LRS year
    let currentRoutes = routesResponse.Current;

    /** @type {string[]} */
    const routeList = [];

    // Put non-ramp route IDs into list
    for (const routeId in currentRoutes) {
        if (currentRoutes.hasOwnProperty(routeId)) {
            const routeType = currentRoutes[routeId];
            if (routeType != 4) {
                routeList.push(routeId);
            }
        }
    }

    // Add value to 'routes' attribute as comma-separated list string.
    document
        .querySelector("route-selector")
        .setAttribute("routes", routeList.join(","));
}).catch(e => {
    console.error(e);
});
