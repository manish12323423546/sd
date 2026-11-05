// The ten reference shots. Positions in metres; the temple sits at the origin,
// ghats face west-north-west into the setting sun, harbour is to the south-east.
export const SHOTS = [
  { name: '01_hero_bay', pos: [-430, 48, -640], target: [-20, 22, -20], fov: 36, shadow: { c: [-60, 0, -120], r: 560 } },
  { name: '02_aerial', pos: [-760, 560, 520], target: [10, 0, -30], fov: 42, shadow: { c: [0, 0, 0], r: 520 } },
  { name: '03_harbour', pos: [330, 3.2, 540], target: [190, 14, 330], fov: 44, shadow: { c: [230, 0, 380], r: 220 } },
  { name: '04_temple_low', pos: [-66, 12.5, 30], target: [10, 44, -4], fov: 56, shadow: { c: [0, 0, 0], r: 110 } },
  { name: '05_avenue', pos: [-46, 8.6, 236], target: [0, 30, 0], fov: 46, shadow: { c: [-20, 0, 130], r: 160 } },
  { name: '06_ramparts', pos: [-226, 7, -488], target: [-340, 10, -250], fov: 46, shadow: { c: [-300, 0, -330], r: 180 } },
  { name: '07_ghats', pos: [-454.5, 13, -184.9], target: [-392.0, 4, -60.8], fov: 48, shadow: { c: [-400, 0, -70], r: 200 } },
  { name: '08_silhouette', pos: [640, 12, 60], target: [0, 30, -60], fov: 34, shadow: { c: [0, 0, 0], r: 520 } },
  { name: '09_rooftop', pos: [150, 34, 62], target: [-450, -12, 10], fov: 52, shadow: { c: [-60, 0, 0], r: 260 } },
  { name: '10_torana', pos: [-176, 11.2, -34], target: [0, 33, 0], fov: 42, shadow: { c: [-90, 0, -17], r: 130 } },
];
