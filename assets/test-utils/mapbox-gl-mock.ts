class Map {
  on() {
    return this
  }
  remove() {}
  getZoom() {
    return 1
  }
  getCenter() {
    return { lng: 0, lat: 0 }
  }
  easeTo() {}
  stop() {}
  flyTo() {}
  setFog() {}
}

class Marker {
  element: HTMLElement
  constructor({ element }: { element: HTMLElement }) {
    this.element = element
  }
  setLngLat() {
    return this
  }
  addTo() {
    return this
  }
  remove() {}
  getElement() {
    return this.element
  }
}

class Popup {
  on() {
    return this
  }
  setDOMContent() {
    return this
  }
}

export default { Map, Marker, Popup, accessToken: '' }
