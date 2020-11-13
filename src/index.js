
// Since there's only one form on the page, we know 
// it will be the first (#0) form.
const theForm = document.forms.item(0);

const elcRoot = "https://data.wsdot.wa.gov/arcgis/rest/services/Shared/ElcRestSOE/MapServer/exts/ElcRestSoe"
const routesUrl = `${elcRoot}/routes?f=json`;
const findRouteLocationsUrl = `${elcRoot}/Find%20Route%20Locations`;
const regionQueryUrl = "https://data.wsdot.wa.gov/arcgis/rest/services/Shared/RegionBoundaries/MapServer/0/query";
const countyQueryUrl = "https://data.wsdot.wa.gov/arcgis/rest/services/Shared/CountyBoundaries/MapServer/0/query";
const countyFeatureNameField = "JURLBL";
const regionFeatureNameField = "RegionName";

/**
 * Checks an object to see if it has an "x" and "y" property,
 * which means it is a point.
 * @param {*} geometry 
 * @returns {boolean}
 */
function objectIsPoint(geometry) {
    return geometry.hasOwnProperty("x") && geometry.hasOwnProperty("y");
}

async function getFeatureNameForGeometry(routeGeometry, inSR,
    layerQueryUrl,
    featureNameField) {

    const params = new URLSearchParams();
    params.set("outFields", featureNameField);
    params.set("returnGeometry", false);
    params.set("f", "json");

    const isPoint = objectIsPoint(routeGeometry);

    params.set("inSR", inSR);
    const geometryType = `esriGeometry${isPoint ? "Point" : "Polyline"}`;
    params.set("geometry", JSON.stringify(routeGeometry));
    params.set("geometryType", geometryType);
    params.set("spatialRel", `esriSpatialRel${isPoint ? "Within" : "Intersects"}`);

    const queryResults = await fetch(layerQueryUrl, {
        body: params.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        method: "POST"
    }).then(qr => qr.json());

    const outputSet = new Set();

    const features = queryResults.features;

    for (const feature of features) {
        const county = feature.attributes[featureNameField];
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
            EndSrmp: !isNaN(srmp2) ? srmp2 : null,
            Decrease: isDecrease
        };

        console.log("location", location);


        const elcUrl = new URL(findRouteLocationsUrl)
        const elcParams = elcUrl.searchParams;
        elcParams.set("f", "json");
        elcParams.set("referenceDate", referenceDate);
        elcParams.set("locations", JSON.stringify([location]));

        fetch(elcUrl.toString()).then(r => r.json()).then(response => {

            const location = response[0];
            const geometry = location.RouteGeometry;
            delete geometry.__type;
            const inSR = geometry.spatialReference.wkid;
            delete geometry.spatialReference;

            // Query county feature layer
            getFeatureNameForGeometry(
                geometry,
                inSR,
                countyQueryUrl,
                countyFeatureNameField
            ).then(counties => {
                const countyBox = document.getElementById("countyBox");
                countyBox.value = new Array(...counties).join(",");
            });

            // Query county feature layer
            getFeatureNameForGeometry(
                geometry,
                inSR,
                regionQueryUrl,
                regionFeatureNameField
            ).then(regions => {
                const regionBox = document.getElementById("regionBox");
                regionBox.value = new Array(...regions).join(",");
            });
        });
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
