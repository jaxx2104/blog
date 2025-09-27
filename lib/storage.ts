import localforage from "localforage"

const storage = localforage.createInstance({
  driver: localforage.LOCALSTORAGE,
  name: "app",
  storeName: "context",
  version: 1,
})

export default storage
