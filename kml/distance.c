/*
 * Copyright 2018 Uber Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Example program that calculates the distance in kilometers between two
 * hexagon indices.
 */

// mean Earth radius
#define R 6371.0088
#define BUFF_SIZE 256

#include <h3/h3api.h>
#include <stdlib.h>
#include <math.h>
#include <stdio.h>
#include <inttypes.h>


/**
 * @brief haversineDistance finds the
 * [great-circle distance](https://en.wikipedia.org/wiki/Great-circle_distance)
 * between two points on a sphere.
 * @see https://en.wikipedia.org/wiki/Haversine_formula.
 *
 * Parameters are the latitude and longitude of the first and second point in
 * radians, respectively.
 *
 * @return the great-circle distance in kilometers.
 */
double haversineDistance(double th1, double ph1, double th2, double ph2) {
    double dx, dy, dz;
    ph1 -= ph2;

    dz = sin(th1) - sin(th2);
    dx = cos(ph1) * cos(th1) - cos(th2);
    dy = sin(ph1) * cos(th1);
    return asin(sqrt(dx * dx + dy * dy + dz * dz) / 2) * 2 * R;
}

int main(int argc, char *argv[]) {
    // 1455 Market St @ resolution 15


    GeoCoord xVerts[1048];
    char buff[BUFF_SIZE];
    double lat, lon;
    int i = 0;;
    while (1) {
        // get a lat/lon from stdin
        if (!fgets(buff, BUFF_SIZE, stdin)) {
            if (feof(stdin))
                break;
            else{
                fflush(stdout);
                fflush(stderr);
                fprintf(stderr, "ERROR: \n");
                exit(1);
            }
        }

        if (sscanf(buff, "%lf %lf", &lat, &lon) != 2) {
                 fflush(stdout);
                fflush(stderr);
                fprintf(stderr, "ERROR: \n");
                exit(1);
        }

        // convert to H3()
        GeoCoord g;
        double lat_deg = degsToRads(lat);
        double lon_deg = degsToRads(lon);

        printf("%lf %lf\n", lat, lon);
        printf("%lf %lf\n", lat_deg, lon_deg);
        xVerts[i].lat = lat_deg;
        xVerts[i].lon = lon_deg;
        i++;
    }

    Geofence sfGeofence;
    sfGeofence.numVerts = i;
    sfGeofence.verts = xVerts;   
    
    GeoPolygon sfGeoPolygon;
    sfGeoPolygon.numHoles = 0;
    sfGeoPolygon.geofence = sfGeofence;

    int numHexagons = maxPolyfillSize(&sfGeoPolygon,11);
    H3Index* hexagons = calloc(numHexagons, sizeof(H3Index));

    polyfill(&sfGeoPolygon, 11, hexagons);


    for (int i = 0; i < numHexagons; i++) {
        // Some indexes may be 0 to indicate fewer than the maximum
        // number of indexes.
        if (hexagons[i] != 0) {
            printf("%" PRIx64 "\n", hexagons[i]);
        }
    }
    
    free(hexagons);


    // Output:
    // origin: (37.775236, 237.580245)
    // destination: (37.789991, 237.597879)
    // distance: 2.256850km
}
