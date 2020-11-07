import { RouteLocator } from "wsdot-elc";
// import "@wsdot/route-selector";

const routeLocator = new RouteLocator();

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
