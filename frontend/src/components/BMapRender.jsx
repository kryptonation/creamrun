import {
  DirectionsRenderer,
  DirectionsService,
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import { memo, useCallback, useState } from "react";
import { AdvancedMarker, APIProvider, Map } from "@vis.gl/react-google-maps";

const containerStyle = {
  width: "100%",
  height: "100%",
};
// "gps_start_lat": "13.0482° N",
// "gps_start_lon": "80.2422° E",
// "gps_end_lat": "12.9923° N",
//       "gps_end_lon": "80.1972° E",
const center = { lat: 12.9923, lng: 80.1972 };
const BMapRender = () => {
  // const [directions, setDirections] = useState(null);
  // const origin = { lat: 12.9923, lng: 80.1972 }; // Example origin: New York City
  // const directionsServiceOptions = {
  //     center,
  //     origin,
  //     travelMode: 'DRIVING',
  // };
  // const directionsCallback = (response, status) => {
  //     if (status === 'OK') {
  //         setDirections(response);
  //     } else {
  //         console.error(`Error fetching directions: ${status}`);
  //     }
  // };
  // const { isLoaded } = useJsApiLoader({
  //     id: 'google-map-script',
  //     googleMapsApiKey: 'AIzaSyDX1g4T9TQFhOFKWawEwNFZAMa-gGSulhU',
  // })

  // const [, setMap] = useState(null)

  // const onLoad = useCallback(function callback(map) {
  //     // This is just an example of getting and using the map instance!!! don't just blindly copy!
  //     const bounds = new window.google.maps.LatLngBounds(center)
  //     map.fitBounds(bounds)

  //     setMap(map)
  // }, [])

  // const onUnmount = useCallback(function callback() {
  //     setMap(null)
  // }, []);
  // // const apiKey = '';

  // return isLoaded ? (
  //     <GoogleMap
  //         mapContainerStyle={containerStyle}
  //         center={center}
  //         zoom={10}
  //         onLoad={onLoad}
  //         onUnmount={onUnmount}
  //     >
  //     <Marker position={center} />
  //         {/* <DirectionsService
  //             options={directionsServiceOptions}
  //             callback={directionsCallback}
  //         />
  //         {directions && <DirectionsRenderer directions={directions} />} */}
  //     </GoogleMap>
  // ) : (
  //     <></>
  // )
  const position = { lat: 12.9923, lng: 80.1972 };
  return (
    <APIProvider apiKey={""}>
      <Map defaultCenter={position} defaultZoom={10} mapId="DEMO_MAP_ID">
        <AdvancedMarker position={position} />
      </Map>
    </APIProvider>
  );
};

export default memo(BMapRender);
