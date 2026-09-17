import * as d3 from 'd3'
import {
  COUNTRIES_BY_TWO_LETTER_CODE,
  parseWorldTopoJsonToGeoJsonFeatures
} from '../countries'

export type Coordinates = [number, number]

type CitiesCoords = Record<string, [number, number]>

let citiesCoordsPromise: Promise<CitiesCoords> | null = null

export function loadCitiesCoords(): Promise<CitiesCoords> {
  if (!citiesCoordsPromise) {
    citiesCoordsPromise = fetch('/data/cities_coords.json').then((response) =>
      response.json()
    )
  }
  return citiesCoordsPromise
}

const countryCentroids: Record<string, Coordinates> = Object.fromEntries(
  parseWorldTopoJsonToGeoJsonFeatures().map((feature) => [
    feature.properties.a3,
    // @ts-expect-error feature type is narrowed to the properties the map cares about
    d3.geoCentroid(feature) as Coordinates
  ])
)

export function lookupCoordinates(
  citiesCoords: CitiesCoords,
  cityGeonameId: number,
  countryCode: string
): Coordinates | null {
  const city = citiesCoords[String(cityGeonameId)]
  if (city) {
    return [city[1], city[0]]
  }
  const alpha3 = COUNTRIES_BY_TWO_LETTER_CODE[countryCode]?.alpha_3
  return alpha3 ? (countryCentroids[alpha3] ?? null) : null
}
