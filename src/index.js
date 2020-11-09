import { RouteLocator } from "wsdot-elc";
// import "@wsdot/route-selector";

const routeLocator = new RouteLocator();

// Since there's only one form on the page, we know 
// it will be the first (#0) form.
const theForm = document.forms.item(0);

// Create event handler for form submit event.
theForm.addEventListener("submit", function (e) {

    try {
        const route = document.getElementById("routeSelector").value
        console.log(route);
    }
    catch (err) {
        console.error(err);
    }


    // Stop the default behavior which would reload the page.
    e.preventDefault();
});

// Query ELC for list of routes and then populate
// the route select control.
routeLocator.getRouteList(true).then(routeList => {
    // Get current LRS route list
    let routes = routeList.Current;
    // Filter out ramps
    routes = routes.filter(r => !r.isRamp);

    // Convert route objects to strings.
    const routeIds = routes.map(r => r.routeId.toString());

    // Add value to 'routes' attribute as comma-separated list string.
    document
        .querySelector("route-selector")
        .setAttribute("routes", routeIds.join(","));
});
