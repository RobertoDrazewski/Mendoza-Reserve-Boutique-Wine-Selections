/*
 * Winery data for the landing.
 *
 * SAMPLE DATA: these nine entries are placeholders so the interface can be reviewed.
 * They are not real wineries. To show the real list, either:
 *   1) set  window.MR_API = "/api/wineries"  before js/main.js loads (see loadWineries() in
 *      js/main.js for the field mapping), or
 *   2) replace the array below with the real entries.
 *
 * Fields: id, name, region (key from MR_REGIONS), grapes[], note, lat, lon, sample (true for placeholders)
 */
window.MR_REGIONS = [
  { id: "lujan",     name: "Luján de Cuyo" },
  { id: "maipu",     name: "Maipú" },
  { id: "uco",       name: "Valle de Uco" },
  { id: "sanrafael", name: "San Rafael" }
];

window.MR_WINERIES = [
  { id: "s1", name: "Sample winery I",    region: "lujan",     lat: -33.040, lon: -68.900, grapes: ["Malbec", "Cabernet Sauvignon"], note: "Placeholder entry. The real description of the winery appears here.", sample: true },
  { id: "s2", name: "Sample winery II",   region: "lujan",     lat: -33.090, lon: -68.870, grapes: ["Malbec"],                       note: "Placeholder entry. The real description of the winery appears here.", sample: true },
  { id: "s3", name: "Sample winery III",  region: "maipu",     lat: -32.990, lon: -68.740, grapes: ["Bonarda", "Syrah"],             note: "Placeholder entry. The real description of the winery appears here.", sample: true },
  { id: "s4", name: "Sample winery IV",   region: "maipu",     lat: -33.050, lon: -68.690, grapes: ["Malbec", "Bonarda"],            note: "Placeholder entry. The real description of the winery appears here.", sample: true },
  { id: "s5", name: "Sample winery V",    region: "uco",       lat: -33.370, lon: -69.150, grapes: ["Chardonnay", "Pinot Noir"],     note: "Placeholder entry. The real description of the winery appears here.", sample: true },
  { id: "s6", name: "Sample winery VI",   region: "uco",       lat: -33.570, lon: -69.020, grapes: ["Malbec", "Cabernet Franc"],     note: "Placeholder entry. The real description of the winery appears here.", sample: true },
  { id: "s7", name: "Sample winery VII",  region: "uco",       lat: -33.770, lon: -69.050, grapes: ["Torrontés", "Chardonnay"],      note: "Placeholder entry. The real description of the winery appears here.", sample: true },
  { id: "s8", name: "Sample winery VIII", region: "sanrafael", lat: -34.610, lon: -68.330, grapes: ["Chenin Blanc", "Malbec"],       note: "Placeholder entry. The real description of the winery appears here.", sample: true },
  { id: "s9", name: "Sample winery IX",   region: "sanrafael", lat: -34.680, lon: -68.250, grapes: ["Cabernet Franc"],               note: "Placeholder entry. The real description of the winery appears here.", sample: true }
];
