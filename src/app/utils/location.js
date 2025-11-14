// Get device geolocation (browser). Returns { latitude, longitude } or null if unavailable.
export function getDeviceLocation() {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        resolve({ latitude, longitude });
      },
      () => resolve(null)
    );
  });
}