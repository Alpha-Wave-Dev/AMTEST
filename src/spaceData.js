// Seed data for the Space Economy Dashboard.
// Each field is intentionally sparse so the Seeker agent has concrete work to do.
// All timestamps are set to a stale anchor so the first auto-tick prioritizes refresh.

// 12 value-chain segments arranged radially around the center.
// `angle` is fraction of full circle (0..1). Color is the segment hue.
export const SEGMENTS = [
  { id: 'launch',     name: 'Launch',                         angle: 0.00,  color: '#ff7a59', blurb: 'Orbital launch vehicles, propulsion stages, rideshare brokers' },
  { id: 'satmfg',     name: 'Satellite Manufacturing',        angle: 0.083, color: '#ffa94d', blurb: 'Buses, payloads, integration, vertically-integrated builders' },
  { id: 'satcom',     name: 'Satellite Comms',                angle: 0.167, color: '#ffd43b', blurb: 'LEO/MEO/GEO connectivity, broadband, direct-to-cell' },
  { id: 'eo',         name: 'Earth Observation',              angle: 0.250, color: '#a9e34b', blurb: 'Imagery, SAR, RF, hyperspectral, geospatial analytics' },
  { id: 'stations',   name: 'Stations & Habitats',            angle: 0.333, color: '#51cf66', blurb: 'Commercial stations, habitats, in-space manufacturing' },
  { id: 'mobility',   name: 'In-Space Mobility',              angle: 0.417, color: '#20c997', blurb: 'Orbital transfer vehicles, tugs, refueling, deorbit' },
  { id: 'lunar',      name: 'Lunar & Cislunar',               angle: 0.500, color: '#22b8cf', blurb: 'Lunar landers, rovers, comms relays, ISRU' },
  { id: 'defense',    name: 'National Security Space',        angle: 0.583, color: '#4dabf7', blurb: 'Proliferated warfighter constellations, primes, defense tech' },
  { id: 'ssa',        name: 'Space Domain Awareness',         angle: 0.667, color: '#748ffc', blurb: 'Tracking, collision avoidance, RF geolocation, SSA-as-a-service' },
  { id: 'components', name: 'Components & Subsystems',        angle: 0.750, color: '#9775fa', blurb: 'Avionics, propulsion, optics, radios, structures' },
  { id: 'ground',     name: 'Ground Segment & Data',          angle: 0.833, color: '#cc5de8', blurb: 'Ground stations, antennas, modems, data pipelines' },
  { id: 'software',   name: 'Software, AI & Ops',             angle: 0.917, color: '#f06595', blurb: 'Mission ops, flight software, AI tasking, digital twins' },
];

const STAGE = {
  IPO:     'public',
  LATE:    'late_private',
  GROWTH:  'growth',
  EARLY:   'early',
  SEED:    'seed',
  PRIME:   'prime', // legacy defense prime / mega-corp
};

// Companies. `tags` drives sub-clustering inside the segment.
// `connections` are seed edges — the Seeker can add more.
//   type: launches_for | supplies | partners_with | customer_of | invested_in | competitor_of | subsidiary_of
export const COMPANIES = [
  // ── LAUNCH ────────────────────────────────────────────
  { id: 'spacex',       name: 'SpaceX',                 ticker: null,    segment: 'launch',     stage: STAGE.LATE,   hq: 'Hawthorne, CA',     founded: 2002, tags: ['heavy','reusable','starship'] },
  { id: 'rklb',         name: 'Rocket Lab',             ticker: 'RKLB',  segment: 'launch',     stage: STAGE.IPO,    hq: 'Long Beach, CA',    founded: 2006, tags: ['small','reusable','neutron'] },
  { id: 'blue',         name: 'Blue Origin',            ticker: null,    segment: 'launch',     stage: STAGE.LATE,   hq: 'Kent, WA',          founded: 2000, tags: ['heavy','reusable','suborbital'] },
  { id: 'ula',          name: 'United Launch Alliance', ticker: null,    segment: 'launch',     stage: STAGE.PRIME,  hq: 'Centennial, CO',    founded: 2006, tags: ['heavy','vulcan','jv'] },
  { id: 'firefly',      name: 'Firefly Aerospace',      ticker: 'FLY',   segment: 'launch',     stage: STAGE.IPO,    hq: 'Cedar Park, TX',    founded: 2014, tags: ['small','lunar','alpha'] },
  { id: 'relativity',   name: 'Relativity Space',       ticker: null,    segment: 'launch',     stage: STAGE.LATE,   hq: 'Long Beach, CA',    founded: 2015, tags: ['printed','terran-r'] },
  { id: 'stoke',        name: 'Stoke Space',            ticker: null,    segment: 'launch',     stage: STAGE.GROWTH, hq: 'Kent, WA',          founded: 2019, tags: ['fully-reusable','medium'] },
  { id: 'abl',          name: 'ABL Space Systems',      ticker: null,    segment: 'launch',     stage: STAGE.GROWTH, hq: 'El Segundo, CA',    founded: 2017, tags: ['small','responsive'] },

  // ── SATELLITE MANUFACTURING ───────────────────────────
  { id: 'maxar',        name: 'Maxar Space Systems',    ticker: null,    segment: 'satmfg',     stage: STAGE.LATE,   hq: 'Westminster, CO',   founded: 1969, tags: ['geo','legacy'] },
  { id: 'astranis',     name: 'Astranis',               ticker: null,    segment: 'satmfg',     stage: STAGE.LATE,   hq: 'San Francisco, CA', founded: 2015, tags: ['micro-geo','dedicated'] },
  { id: 'apex',         name: 'Apex Space',             ticker: null,    segment: 'satmfg',     stage: STAGE.GROWTH, hq: 'Los Angeles, CA',   founded: 2022, tags: ['productized-bus','aries'] },
  { id: 'terran',       name: 'Terran Orbital',         ticker: 'LLAP',  segment: 'satmfg',     stage: STAGE.IPO,    hq: 'Boca Raton, FL',    founded: 2013, tags: ['smallsat','tranche'] },
  { id: 'loftorbital',  name: 'Loft Orbital',           ticker: null,    segment: 'satmfg',     stage: STAGE.GROWTH, hq: 'San Francisco, CA', founded: 2017, tags: ['hosted-payload','condor'] },
  { id: 'astsm',        name: 'AST SpaceMobile',        ticker: 'ASTS',  segment: 'satmfg',     stage: STAGE.IPO,    hq: 'Midland, TX',       founded: 2017, tags: ['d2c','bluebird'] },
  { id: 'kepler',       name: 'Kepler Communications',  ticker: null,    segment: 'satmfg',     stage: STAGE.GROWTH, hq: 'Toronto, ON',       founded: 2015, tags: ['relay','optical'] },

  // ── SATELLITE COMMS ───────────────────────────────────
  { id: 'starlink',     name: 'Starlink',               ticker: null,    segment: 'satcom',     stage: STAGE.LATE,   hq: 'Hawthorne, CA',     founded: 2015, tags: ['leo','d2c','consumer'] },
  { id: 'kuiper',       name: 'Project Kuiper',         ticker: null,    segment: 'satcom',     stage: STAGE.PRIME,  hq: 'Redmond, WA',       founded: 2019, tags: ['leo','amazon'] },
  { id: 'oneweb',       name: 'Eutelsat OneWeb',        ticker: 'ETL.PA',segment: 'satcom',     stage: STAGE.IPO,    hq: 'London, UK',        founded: 2012, tags: ['leo','enterprise'] },
  { id: 'iridium',      name: 'Iridium Communications', ticker: 'IRDM',  segment: 'satcom',     stage: STAGE.IPO,    hq: 'McLean, VA',        founded: 2000, tags: ['leo','iot'] },
  { id: 'viasat',       name: 'Viasat',                 ticker: 'VSAT',  segment: 'satcom',     stage: STAGE.IPO,    hq: 'Carlsbad, CA',      founded: 1986, tags: ['geo','inflight'] },
  { id: 'ses',          name: 'SES',                    ticker: 'SESG.PA',segment: 'satcom',    stage: STAGE.IPO,    hq: 'Betzdorf, LU',      founded: 1985, tags: ['geo','meo','o3b'] },
  { id: 'intelsat',     name: 'Intelsat',               ticker: null,    segment: 'satcom',     stage: STAGE.LATE,   hq: 'McLean, VA',        founded: 1964, tags: ['geo'] },
  { id: 'telesat',      name: 'Telesat Lightspeed',     ticker: 'TSAT',  segment: 'satcom',     stage: STAGE.IPO,    hq: 'Ottawa, ON',        founded: 1969, tags: ['leo','enterprise'] },

  // ── EARTH OBSERVATION ─────────────────────────────────
  { id: 'planet',       name: 'Planet Labs',            ticker: 'PL',    segment: 'eo',         stage: STAGE.IPO,    hq: 'San Francisco, CA', founded: 2010, tags: ['optical','daily'] },
  { id: 'blacksky',     name: 'BlackSky',               ticker: 'BKSY',  segment: 'eo',         stage: STAGE.IPO,    hq: 'Herndon, VA',       founded: 2014, tags: ['optical','tip-cue'] },
  { id: 'maxar_eo',     name: 'Maxar Intelligence',     ticker: null,    segment: 'eo',         stage: STAGE.LATE,   hq: 'Westminster, CO',   founded: 1969, tags: ['optical','vhr'] },
  { id: 'capella',      name: 'Capella Space',          ticker: null,    segment: 'eo',         stage: STAGE.GROWTH, hq: 'San Francisco, CA', founded: 2016, tags: ['sar'] },
  { id: 'iceye',        name: 'ICEYE',                  ticker: null,    segment: 'eo',         stage: STAGE.LATE,   hq: 'Espoo, FI',         founded: 2014, tags: ['sar'] },
  { id: 'umbra',        name: 'Umbra',                  ticker: null,    segment: 'eo',         stage: STAGE.GROWTH, hq: 'Santa Barbara, CA', founded: 2015, tags: ['sar','vhr'] },
  { id: 'hawkeye360',   name: 'HawkEye 360',            ticker: null,    segment: 'eo',         stage: STAGE.GROWTH, hq: 'Herndon, VA',       founded: 2015, tags: ['rf-geo'] },
  { id: 'satellogic',   name: 'Satellogic',             ticker: 'SATL',  segment: 'eo',         stage: STAGE.IPO,    hq: 'Buenos Aires, AR', founded: 2010, tags: ['optical','submetric'] },

  // ── STATIONS & HABITATS ───────────────────────────────
  { id: 'vast',         name: 'Vast Space',             ticker: null,    segment: 'stations',   stage: STAGE.GROWTH, hq: 'Long Beach, CA',    founded: 2021, tags: ['station','haven'] },
  { id: 'axiom',        name: 'Axiom Space',            ticker: null,    segment: 'stations',   stage: STAGE.LATE,   hq: 'Houston, TX',       founded: 2016, tags: ['station','iss'] },
  { id: 'sierra',       name: 'Sierra Space',           ticker: null,    segment: 'stations',   stage: STAGE.LATE,   hq: 'Louisville, CO',    founded: 2021, tags: ['orbital-reef','dreamchaser'] },
  { id: 'voyager',      name: 'Voyager Technologies',   ticker: 'VOYG',  segment: 'stations',   stage: STAGE.IPO,    hq: 'Denver, CO',        founded: 2019, tags: ['starlab','defense'] },
  { id: 'varda',        name: 'Varda Space Industries', ticker: null,    segment: 'stations',   stage: STAGE.GROWTH, hq: 'El Segundo, CA',    founded: 2020, tags: ['ism','pharma','reentry'] },

  // ── IN-SPACE MOBILITY ─────────────────────────────────
  { id: 'impulse',      name: 'Impulse Space',          ticker: null,    segment: 'mobility',   stage: STAGE.GROWTH, hq: 'Redondo Beach, CA', founded: 2021, tags: ['otv','mira','helios'] },
  { id: 'momentus',     name: 'Momentus',               ticker: 'MNTS',  segment: 'mobility',   stage: STAGE.IPO,    hq: 'San Jose, CA',      founded: 2017, tags: ['otv','water-plasma'] },
  { id: 'dorbit',       name: 'D-Orbit',                ticker: null,    segment: 'mobility',   stage: STAGE.GROWTH, hq: 'Como, IT',          founded: 2011, tags: ['otv','ion'] },
  { id: 'orbitfab',     name: 'Orbit Fab',              ticker: null,    segment: 'mobility',   stage: STAGE.EARLY,  hq: 'Lafayette, CO',     founded: 2018, tags: ['refueling','gas-station'] },
  { id: 'astroscale',   name: 'Astroscale',             ticker: '186A.T',segment: 'mobility',   stage: STAGE.IPO,    hq: 'Tokyo, JP',         founded: 2013, tags: ['servicing','deorbit'] },

  // ── LUNAR & CISLUNAR ──────────────────────────────────
  { id: 'intuitive',    name: 'Intuitive Machines',     ticker: 'LUNR',  segment: 'lunar',      stage: STAGE.IPO,    hq: 'Houston, TX',       founded: 2013, tags: ['lander','clps'] },
  { id: 'astrobotic',   name: 'Astrobotic',             ticker: null,    segment: 'lunar',      stage: STAGE.GROWTH, hq: 'Pittsburgh, PA',    founded: 2007, tags: ['lander','rover','clps'] },
  { id: 'ispace',       name: 'ispace',                 ticker: '9348.T',segment: 'lunar',      stage: STAGE.IPO,    hq: 'Tokyo, JP',         founded: 2010, tags: ['lander','japan'] },
  { id: 'firefly_lunar',name: 'Firefly Blue Ghost',     ticker: 'FLY',   segment: 'lunar',      stage: STAGE.IPO,    hq: 'Cedar Park, TX',    founded: 2014, tags: ['lander','clps'] },
  { id: 'lunarout',     name: 'Lunar Outpost',          ticker: null,    segment: 'lunar',      stage: STAGE.GROWTH, hq: 'Arvada, CO',        founded: 2017, tags: ['rover','isru'] },

  // ── NATIONAL SECURITY SPACE ───────────────────────────
  { id: 'anduril',      name: 'Anduril',                ticker: null,    segment: 'defense',    stage: STAGE.LATE,   hq: 'Costa Mesa, CA',    founded: 2017, tags: ['ai','c2','space'] },
  { id: 'palantir',     name: 'Palantir',               ticker: 'PLTR',  segment: 'defense',    stage: STAGE.IPO,    hq: 'Denver, CO',        founded: 2003, tags: ['software','warp-speed'] },
  { id: 'true_anomaly', name: 'True Anomaly',           ticker: null,    segment: 'defense',    stage: STAGE.GROWTH, hq: 'Centennial, CO',    founded: 2022, tags: ['ssa','jackal'] },
  { id: 'lmt',          name: 'Lockheed Martin Space',  ticker: 'LMT',   segment: 'defense',    stage: STAGE.IPO,    hq: 'Bethesda, MD',      founded: 1995, tags: ['prime','geo','heavy'] },
  { id: 'noc',          name: 'Northrop Grumman Space', ticker: 'NOC',   segment: 'defense',    stage: STAGE.IPO,    hq: 'Falls Church, VA',  founded: 1994, tags: ['prime','mev','antares'] },
  { id: 'l3harris',     name: 'L3Harris',               ticker: 'LHX',   segment: 'defense',    stage: STAGE.IPO,    hq: 'Melbourne, FL',     founded: 2019, tags: ['payload','tracking-layer'] },
  { id: 'rtx',          name: 'RTX (Raytheon)',         ticker: 'RTX',   segment: 'defense',    stage: STAGE.IPO,    hq: 'Arlington, VA',     founded: 2020, tags: ['prime','missile-warning'] },

  // ── SSA ───────────────────────────────────────────────
  { id: 'leolabs',      name: 'LeoLabs',                ticker: null,    segment: 'ssa',        stage: STAGE.GROWTH, hq: 'Menlo Park, CA',    founded: 2016, tags: ['radar','tracking'] },
  { id: 'slingshot',    name: 'Slingshot Aerospace',    ticker: null,    segment: 'ssa',        stage: STAGE.GROWTH, hq: 'El Segundo, CA',    founded: 2017, tags: ['ssa','optical','rf'] },
  { id: 'northstar',    name: 'NorthStar Earth & Space',ticker: null,    segment: 'ssa',        stage: STAGE.GROWTH, hq: 'Montréal, QC',      founded: 2017, tags: ['space-based-ssa'] },
  { id: 'exoanalytic',  name: 'ExoAnalytic Solutions',  ticker: null,    segment: 'ssa',        stage: STAGE.GROWTH, hq: 'Foothill Ranch, CA',founded: 2008, tags: ['optical','geo-monitoring'] },

  // ── COMPONENTS & SUBSYSTEMS ───────────────────────────
  { id: 'ursamajor',    name: 'Ursa Major',             ticker: null,    segment: 'components', stage: STAGE.GROWTH, hq: 'Berthoud, CO',      founded: 2015, tags: ['propulsion','hadley'] },
  { id: 'phasefour',    name: 'Phase Four',             ticker: null,    segment: 'components', stage: STAGE.EARLY,  hq: 'El Segundo, CA',    founded: 2015, tags: ['propulsion','rf-thruster'] },
  { id: 'aerojet',      name: 'Aerojet Rocketdyne',     ticker: 'LHX',   segment: 'components', stage: STAGE.IPO,    hq: 'El Segundo, CA',    founded: 1942, tags: ['propulsion','legacy'] },
  { id: 'redwire',      name: 'Redwire',                ticker: 'RDW',   segment: 'components', stage: STAGE.IPO,    hq: 'Jacksonville, FL',  founded: 2020, tags: ['solar','optics','ism'] },
  { id: 'hadrian',      name: 'Hadrian',                ticker: null,    segment: 'components', stage: STAGE.GROWTH, hq: 'Hawthorne, CA',     founded: 2020, tags: ['precision-mfg','factory'] },
  { id: 'karman',       name: 'Karman Holdings',        ticker: 'KRMN',  segment: 'components', stage: STAGE.IPO,    hq: 'Huntington Beach,CA',founded: 2002, tags: ['structures','missile'] },

  // ── GROUND SEGMENT & DATA ─────────────────────────────
  { id: 'ksat',         name: 'Kongsberg Satellite (KSAT)',ticker:null,  segment: 'ground',     stage: STAGE.PRIME,  hq: 'Tromsø, NO',        founded: 2002, tags: ['ground','poles'] },
  { id: 'aws_gs',       name: 'AWS Ground Station',     ticker: 'AMZN',  segment: 'ground',     stage: STAGE.IPO,    hq: 'Seattle, WA',       founded: 2018, tags: ['ground-as-a-service'] },
  { id: 'atlas',        name: 'ATLAS Space Operations', ticker: null,    segment: 'ground',     stage: STAGE.GROWTH, hq: 'Traverse City, MI', founded: 2015, tags: ['ground','freedom'] },
  { id: 'viasat_rte',   name: 'Viasat Real-Time Earth', ticker: 'VSAT',  segment: 'ground',     stage: STAGE.IPO,    hq: 'Carlsbad, CA',      founded: 2018, tags: ['ground'] },

  // ── SOFTWARE, AI & OPS ────────────────────────────────
  { id: 'aalyria',      name: 'Aalyria',                ticker: null,    segment: 'software',   stage: STAGE.GROWTH, hq: 'Livermore, CA',     founded: 2022, tags: ['network-orchestration','spacetime'] },
  { id: 'privateer',    name: 'Privateer',              ticker: null,    segment: 'software',   stage: STAGE.EARLY,  hq: 'Maui, HI',          founded: 2021, tags: ['ssa-data','wayfinder'] },
  { id: 'cesium',       name: 'Cesium Astro',           ticker: null,    segment: 'software',   stage: STAGE.GROWTH, hq: 'Austin, TX',        founded: 2017, tags: ['comms-payload','phased-array'] },
  { id: 'mynaric',      name: 'Mynaric',                ticker: 'MYNA',  segment: 'software',   stage: STAGE.IPO,    hq: 'Munich, DE',        founded: 2009, tags: ['optical-terminal'] },
  { id: 'kayhan',       name: 'Kayhan Space',           ticker: null,    segment: 'software',   stage: STAGE.EARLY,  hq: 'Boulder, CO',       founded: 2019, tags: ['conjunction','pathfinder'] },
];

// Initial connection seed — the Seeker will discover more.
// type: launches_for | supplies | partners_with | invested_in | competitor_of
export const CONNECTIONS = [
  // Launch ↔ comms / EO
  { from: 'spacex',       to: 'starlink',     type: 'subsidiary_of' },
  { from: 'spacex',       to: 'planet',       type: 'launches_for' },
  { from: 'spacex',       to: 'iceye',        type: 'launches_for' },
  { from: 'spacex',       to: 'capella',      type: 'launches_for' },
  { from: 'spacex',       to: 'kuiper',       type: 'launches_for' },
  { from: 'spacex',       to: 'astsm',        type: 'launches_for' },
  { from: 'spacex',       to: 'oneweb',       type: 'launches_for' },
  { from: 'spacex',       to: 'intuitive',    type: 'launches_for' },
  { from: 'spacex',       to: 'firefly_lunar',type: 'launches_for' },
  { from: 'spacex',       to: 'vast',         type: 'launches_for' },
  { from: 'spacex',       to: 'varda',        type: 'launches_for' },
  { from: 'rklb',         to: 'blacksky',     type: 'launches_for' },
  { from: 'rklb',         to: 'capella',      type: 'launches_for' },
  { from: 'firefly',      to: 'l3harris',     type: 'partners_with' },
  { from: 'ula',          to: 'kuiper',       type: 'launches_for' },
  { from: 'ula',          to: 'lmt',          type: 'subsidiary_of' },
  { from: 'ula',          to: 'noc',          type: 'subsidiary_of' },
  { from: 'blue',         to: 'kuiper',       type: 'launches_for' },
  { from: 'arianespace_proxy_oneweb_skip', to: 'oneweb', type: 'launches_for' }, // placeholder removed below
  // (we strip placeholders at load — see filter in spaceStore)

  // Sat manufacturing → operator
  { from: 'maxar',        to: 'intelsat',     type: 'supplies' },
  { from: 'maxar',        to: 'ses',          type: 'supplies' },
  { from: 'astranis',     to: 'viasat',       type: 'competitor_of' },
  { from: 'apex',         to: 'true_anomaly', type: 'supplies' },
  { from: 'apex',         to: 'loftorbital',  type: 'competitor_of' },
  { from: 'terran',       to: 'lmt',          type: 'supplies' },
  { from: 'loftorbital',  to: 'spacex',       type: 'customer_of' },

  // Components → integrator
  { from: 'ursamajor',    to: 'firefly',      type: 'supplies' },
  { from: 'ursamajor',    to: 'stoke',        type: 'supplies' },
  { from: 'aerojet',      to: 'ula',          type: 'supplies' },
  { from: 'aerojet',      to: 'lmt',          type: 'subsidiary_of' },
  { from: 'redwire',      to: 'lmt',          type: 'supplies' },
  { from: 'redwire',      to: 'maxar',        type: 'supplies' },
  { from: 'hadrian',      to: 'spacex',       type: 'supplies' },
  { from: 'hadrian',      to: 'anduril',      type: 'supplies' },
  { from: 'cesium',       to: 'blacksky',     type: 'supplies' },
  { from: 'mynaric',      to: 'l3harris',     type: 'supplies' },
  { from: 'mynaric',      to: 'noc',          type: 'supplies' },
  { from: 'mynaric',      to: 'spacex',       type: 'supplies' },
  { from: 'kepler',       to: 'spacex',       type: 'partners_with' },

  // Defense primes → constellation
  { from: 'lmt',          to: 'l3harris',     type: 'partners_with' },
  { from: 'noc',          to: 'l3harris',     type: 'partners_with' },
  { from: 'noc',          to: 'astroscale',   type: 'partners_with' },
  { from: 'spacex',       to: 'l3harris',     type: 'partners_with' }, // tracking-layer
  { from: 'spacex',       to: 'noc',          type: 'partners_with' },
  { from: 'rklb',         to: 'noc',          type: 'partners_with' },
  { from: 'rtx',          to: 'noc',          type: 'partners_with' },
  { from: 'palantir',     to: 'noc',          type: 'partners_with' },
  { from: 'palantir',     to: 'anduril',      type: 'partners_with' },
  { from: 'anduril',      to: 'true_anomaly', type: 'competitor_of' },

  // SSA web
  { from: 'leolabs',      to: 'slingshot',    type: 'competitor_of' },
  { from: 'leolabs',      to: 'kayhan',       type: 'partners_with' },
  { from: 'northstar',    to: 'leolabs',      type: 'competitor_of' },
  { from: 'exoanalytic',  to: 'leolabs',      type: 'competitor_of' },
  { from: 'privateer',    to: 'leolabs',      type: 'competitor_of' },

  // Stations
  { from: 'axiom',        to: 'spacex',       type: 'customer_of' },
  { from: 'vast',         to: 'spacex',       type: 'customer_of' },
  { from: 'sierra',       to: 'voyager',      type: 'partners_with' },
  { from: 'voyager',      to: 'lmt',          type: 'partners_with' },
  { from: 'voyager',      to: 'noc',          type: 'partners_with' },
  { from: 'varda',        to: 'rklb',         type: 'partners_with' },

  // Mobility
  { from: 'impulse',      to: 'spacex',       type: 'partners_with' },
  { from: 'impulse',      to: 'true_anomaly', type: 'supplies' },
  { from: 'dorbit',       to: 'spacex',       type: 'partners_with' },
  { from: 'astroscale',   to: 'ula',          type: 'customer_of' },
  { from: 'orbitfab',     to: 'impulse',      type: 'partners_with' },
  { from: 'momentus',     to: 'spacex',       type: 'launches_for' },

  // Lunar
  { from: 'intuitive',    to: 'spacex',       type: 'customer_of' },
  { from: 'astrobotic',   to: 'ula',          type: 'customer_of' },
  { from: 'astrobotic',   to: 'lunarout',     type: 'partners_with' },
  { from: 'ispace',       to: 'spacex',       type: 'customer_of' },
  { from: 'firefly_lunar',to: 'spacex',       type: 'customer_of' },

  // Comms competition
  { from: 'starlink',     to: 'kuiper',       type: 'competitor_of' },
  { from: 'starlink',     to: 'oneweb',       type: 'competitor_of' },
  { from: 'oneweb',       to: 'kuiper',       type: 'competitor_of' },
  { from: 'astsm',        to: 'starlink',     type: 'competitor_of' },
  { from: 'iridium',      to: 'starlink',     type: 'competitor_of' },
  { from: 'viasat',       to: 'starlink',     type: 'competitor_of' },
  { from: 'ses',          to: 'intelsat',     type: 'competitor_of' },
  { from: 'telesat',      to: 'starlink',     type: 'competitor_of' },

  // EO competition
  { from: 'planet',       to: 'blacksky',     type: 'competitor_of' },
  { from: 'planet',       to: 'satellogic',   type: 'competitor_of' },
  { from: 'iceye',        to: 'capella',      type: 'competitor_of' },
  { from: 'iceye',        to: 'umbra',        type: 'competitor_of' },
  { from: 'maxar_eo',     to: 'planet',       type: 'competitor_of' },

  // Ground
  { from: 'ksat',         to: 'planet',       type: 'supplies' },
  { from: 'ksat',         to: 'iceye',        type: 'supplies' },
  { from: 'aws_gs',       to: 'capella',      type: 'supplies' },
  { from: 'atlas',        to: 'blacksky',     type: 'supplies' },
  { from: 'viasat_rte',   to: 'umbra',        type: 'supplies' },

  // Software / AI
  { from: 'aalyria',      to: 'l3harris',     type: 'partners_with' },
  { from: 'kayhan',       to: 'astroscale',   type: 'partners_with' },
  { from: 'palantir',     to: 'maxar_eo',     type: 'partners_with' },

  // Defense customer relationships (proxy → SDA via primes; kept as in-graph)
  { from: 'l3harris',     to: 'spacex',       type: 'partners_with' },
].filter(c => COMPANIES.find(x => x.id === c.from) && COMPANIES.find(x => x.id === c.to));

// Fields the agents are responsible for keeping fresh on every company.
export const TRACKED_FIELDS = [
  { id: 'description',  label: 'Business description',     priority: 0.5 },
  { id: 'moats',        label: 'Key moats & differentiators', priority: 1.0 },
  { id: 'financials',   label: 'Revenue / margins / cash', priority: 1.5 },
  { id: 'fundraising',  label: 'Latest raise / round',     priority: 1.2 },
  { id: 'valuation',    label: 'Latest valuation',         priority: 1.2 },
  { id: 'partnerships', label: 'Key partnerships',         priority: 0.8 },
  { id: 'recentNews',   label: 'Recent news (last 30d)',   priority: 2.0 },
];

export const CONNECTION_STYLE = {
  launches_for:  { color: '#ff7a59', label: 'launches for',  dash: '0' },
  supplies:      { color: '#9775fa', label: 'supplies',      dash: '0' },
  partners_with: { color: '#22b8cf', label: 'partners with', dash: '4 3' },
  customer_of:   { color: '#51cf66', label: 'customer of',   dash: '0' },
  invested_in:   { color: '#ffd43b', label: 'invested in',   dash: '2 4' },
  competitor_of: { color: '#f06595', label: 'competitor of', dash: '6 4' },
  subsidiary_of: { color: '#cccccc', label: 'subsidiary of', dash: '1 3' },
};
