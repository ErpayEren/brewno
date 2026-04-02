-- ═══════════════════════════════════════════════════════
-- BREWNO — Seed Data
-- Idempotent: safe to run multiple times
-- Run AFTER schema.sql
-- ═══════════════════════════════════════════════════════

-- ─── BADGES ──────────────────────────────────────────────
INSERT INTO badges (name, description, icon, criteria) VALUES
  ('First Pour',       'Made your first check-in',                '☕', '{"type":"checkin_count","value":1}'),
  ('10 Check-ins',     'Checked in 10 coffees',                   '🔟', '{"type":"checkin_count","value":10}'),
  ('50 Check-ins',     'Checked in 50 coffees',                   '🌟', '{"type":"checkin_count","value":50}'),
  ('100 Check-ins',    'Checked in 100 coffees',                  '�', '{"type":"checkin_count","value":100}'),
  ('250 Check-ins',    'Legendary palate — 250 check-ins',        '👑', '{"type":"checkin_count","value":250}'),
  ('World Traveler',   'Tasted coffees from 5+ origins',          '🌍', '{"type":"unique_countries","value":5}'),
  ('Globe Trotter',    'Tasted coffees from 10+ origins',         '✈️', '{"type":"unique_countries","value":10}'),
  ('Natural Lover',    '10+ natural process check-ins',           '🌿', '{"type":"process_count","process":"Natural","value":10}'),
  ('Washed Out',       '10+ washed process check-ins',            '💧', '{"type":"process_count","process":"Washed","value":10}'),
  ('Honey Bee',        '5+ honey process check-ins',              '🍯', '{"type":"process_count","process":"Honey","value":5}'),
  ('Anaerobic Animal', '5+ anaerobic process check-ins',          '🧪', '{"type":"process_count","process":"Anaerobic","value":5}'),
  ('Light Side',       '20+ light roast check-ins',               '☀️', '{"type":"roast_count","roast":"Light","value":20}'),
  ('Ethiopia Obsessed','10+ Ethiopian coffees',                   '🇪🇹', '{"type":"country_count","country":"Ethiopia","value":10}'),
  ('Kenya King',       '10+ Kenyan coffees',                      '🦁', '{"type":"country_count","country":"Kenya","value":10}'),
  ('Perfect Score',    'Rated a coffee 5 stars',                  '⭐', '{"type":"max_rating","value":5}'),
  ('Social Butterfly', 'Followed 10+ people',                     '🦋', '{"type":"following_count","value":10}'),
  ('Trendsetter',      '10+ people follow you',                   '📣', '{"type":"follower_count","value":10}'),
  ('Cafe Explorer',    'Checked in at 10+ different cafes',       '🗺️', '{"type":"unique_cafes","value":10}'),
  ('Barista Friend',   'Checked in at 5+ specialty cafes',        '🎯', '{"type":"unique_cafes","value":5}'),
  ('Expert Palate',    'Left 20+ tasting notes',                  '👅', '{"type":"notes_count","value":20}')
ON CONFLICT (name) DO NOTHING;

-- ─── ROASTERIES ───────────────────────────────────────────
INSERT INTO roasteries (name, slug, location, is_verified) VALUES
  ('Petra Roasting',        'petra-roasting',        'Istanbul, Turkey',    true),
  ('Norm Coffee',           'norm-coffee',           'Istanbul, Turkey',    true),
  ('Kronotrop',             'kronotrop',             'Istanbul, Turkey',    true),
  ('MOC Coffee',            'moc-coffee',            'Istanbul, Turkey',    false),
  ('Stumptown Coffee',      'stumptown',             'Portland, USA',       true),
  ('Intelligentsia Coffee', 'intelligentsia',        'Chicago, USA',        true),
  ('Blue Bottle Coffee',    'blue-bottle',           'Oakland, USA',        true),
  ('Square Mile Coffee',    'square-mile',           'London, UK',          true),
  ('Tim Wendelboe',         'tim-wendelboe',         'Oslo, Norway',        true),
  ('The Barn',              'the-barn',              'Berlin, Germany',     true),
  ('Onibus Coffee',         'onibus-coffee',         'Tokyo, Japan',        true),
  ('Coffee Collective',     'coffee-collective',     'Copenhagen, Denmark', true),
  ('Johansen Coffee',       'johansen-coffee',       'Istanbul, Turkey',    false),
  ('Arabica & Co',          'arabica-co',            'Ankara, Turkey',      false),
  ('Kaplumbaga Roastery',   'kaplumbaga',            'Izmir, Turkey',       false),
  ('Haraaz Coffee',         'haraaz-coffee',         'Sanaa, Yemen',        true),
  ('Heart Coffee',          'heart-coffee',          'Portland, USA',       false),
  ('Paradise Roasters',     'paradise-roasters',     'Anoka, USA',          false),
  ('Ritual Coffee',         'ritual-coffee',         'San Francisco, USA',  false),
  ('Sightglass Coffee',     'sightglass',            'San Francisco, USA',  false)
ON CONFLICT (slug) DO NOTHING;

-- ─── COFFEES ──────────────────────────────────────────────
INSERT INTO coffees (name, origin_country, origin_region, process_method, roast_level, altitude_masl, variety, description)
VALUES
  -- Ethiopia
  ('Yirgacheffe Kochere',        'Ethiopia',        'Yirgacheffe',      'Washed',   'Light',        1900, 'Heirloom',       'Bright lemon verbena, white tea, silky body. The archetype of Ethiopian washed.'),
  ('Guji Natural',               'Ethiopia',        'Guji',             'Natural',  'Light',        2100, 'Heirloom',       'Blueberry jam, rose hip, wild strawberry. A natural that speaks for itself.'),
  ('Yirgacheffe Aricha',         'Ethiopia',        'Yirgacheffe',      'Natural',  'Light',        1850, 'Heirloom',       'Ripe stone fruit, hibiscus, blackberry compote. Complex and layered.'),
  ('Sidama Bensa',               'Ethiopia',        'Sidama',           'Washed',   'Light',        2000, 'Heirloom',       'Clean bergamot, lemon blossom, sparkling acidity.'),
  ('Harrar Longberry',           'Ethiopia',        'Harrar',           'Natural',  'Medium',       1800, 'Longberry',      'Earthy, blueberry, dried fruit, wine-like finish.'),
  ('Gesha Village Natural',      'Ethiopia',        'Bench Maji',       'Natural',  'Light',        1950, 'Gesha',          'Transcendent. Jasmine, bergamot, a kiss of stone fruit on the finish.'),
  ('Bench Maji Washed',          'Ethiopia',        'Bench Maji',       'Washed',   'Light',        2050, 'Heirloom',       'Delicate florals, peach, clean and crisp.'),
  ('Jimma Natural',              'Ethiopia',        'Jimma',            'Natural',  'Medium-Light', 1600, 'Heirloom',       'Chocolate, dried fruit, gentle earthiness.'),
  -- Kenya
  ('Kenya Karundul AA',          'Kenya',           'Central',          'Washed',   'Light',        1750, 'SL28',           'Blackcurrant, grapefruit, pomegranate candy. Classic AA profile.'),
  ('Kenya Ndiaini AB',           'Kenya',           'Kirinyaga',        'Washed',   'Light',        1800, 'SL34',           'Plum, dark cherry, brown sugar sweetness.'),
  ('Kiambu AA',                  'Kenya',           'Kiambu',           'Washed',   'Medium-Light', 1700, 'SL28',           'Juicy, tomato, tamarind, tropical fruit finish.'),
  ('Nyeri Estate Natural',       'Kenya',           'Nyeri',            'Natural',  'Light',        1820, 'SL28/SL34',      'Intense, dried berry, wine, syrupy body.'),
  ('Muranga Peaberry',           'Kenya',           'Muranga',          'Washed',   'Light',        1650, 'Peaberry',       'Lychee, red grape, clean finish with longevity.'),
  -- Colombia
  ('Colombia Huila',             'Colombia',        'Huila',            'Washed',   'Medium',       1800, 'Caturra/Castillo','Milk chocolate, red apple, hazelnut. Balanced and approachable.'),
  ('Colombia Narino',            'Colombia',        'Narino',           'Washed',   'Light',        2100, 'Typica',         'Caramel, orange zest, bright and clean.'),
  ('El Paraiso Double Anaerobic','Colombia',        'Huila',            'Anaerobic','Light',        1950, 'Castillo',       'Tropical, passion fruit, papaya, fermented complexity.'),
  ('Colombia Pink Bourbon',      'Colombia',        'Huila',            'Natural',  'Light',        1900, 'Pink Bourbon',   'Strawberry, rose hip, creamy. A rare and beautiful variety.'),
  ('Monteblanco Geisha',         'Colombia',        'Huila',            'Washed',   'Light',        2000, 'Gesha',          'Delicate jasmine, peach blossom, exceptional clarity.'),
  -- Panama
  ('Panama Elida Natural',       'Panama',          'Boquete',          'Natural',  'Light',        1650, 'Gesha',          'Tropical, floral, winey. A bucket-list coffee.'),
  ('Hacienda La Esmeralda',      'Panama',          'Boquete',          'Washed',   'Light',        1700, 'Gesha',          'The gold standard. Intense florals, stone fruit, unparalleled elegance.'),
  ('Finca Lerida',               'Panama',          'Boquete',          'Natural',  'Light',        1600, 'Caturra',        'Berry, sweet citrus, light body.'),
  -- Yemen
  ('Yemen Haraaz',               'Yemen',           'Haraaz',           'Natural',  'Medium',       1950, 'Yemen Bourbon',  'Dried white flower, salt, long complex finish. Ancient terroir.'),
  ('Yemen Bani Mattari',         'Yemen',           'Sanaa',            'Natural',  'Medium-Light', 1800, 'Yemen Bourbon',  'Dark fruit, tobacco, cedar. Mysterious and unique.'),
  ('Yemen Ismaili',              'Yemen',           'Haraz',            'Natural',  'Light',        2000, 'Ismaili',        'Wild, unpredictable, beautiful. Blueberry meets dry wine.'),
  -- Guatemala
  ('Guatemala Huehuetenango',    'Guatemala',       'Huehuetenango',    'Washed',   'Medium',       1800, 'Bourbon',        'Caramel, almond, milk chocolate coating the palate.'),
  ('Guatemala Antigua',          'Guatemala',       'Antigua',          'Washed',   'Medium',       1500, 'Bourbon/Caturra','Full body, dark cherry, cocoa finish.'),
  -- Costa Rica
  ('Costa Rica Tarrazu',         'Costa Rica',      'Tarrazu',          'Honey',    'Medium-Light', 1700, 'Caturra',        'Honey, melon, peach. Gentle and sweet.'),
  ('Monte Copey Honey',          'Costa Rica',      'Tarrazu',          'Honey',    'Light',        1800, 'Catuai',         'Stone fruit, brown sugar, light floral notes.'),
  -- Peru
  ('Peru Cajamarca',             'Peru',            'Cajamarca',        'Washed',   'Medium',       1700, 'Caturra/Bourbon','Milk chocolate, mild citrus, clean and sweet.'),
  -- Rwanda
  ('Rwanda Musasa',              'Rwanda',          'Gakenke',          'Washed',   'Light',        1900, 'Bourbon',        'Red berry, hibiscus, bright clean cup.'),
  ('Rwanda Nyamasheke',          'Rwanda',          'Nyamasheke',       'Natural',  'Light',        1800, 'Bourbon',        'Blueberry, dark plum, wine-like sweetness.'),
  -- Burundi
  ('Burundi Kayanza',            'Burundi',         'Kayanza',          'Washed',   'Light',        1800, 'Bourbon',        'Peach, jasmine, milk oolong finish.'),
  -- El Salvador
  ('El Salvador Pacamara',       'El Salvador',     'Santa Ana',        'Natural',  'Light',        1700, 'Pacamara',       'Big cherry, chocolate, sweetness from the very first sip.'),
  -- Bolivia
  ('Bolivia Caranavi',           'Bolivia',         'Caranavi',         'Washed',   'Light',        1900, 'Typica/Catuai',  'Plum, dark honey, grape. Rare and sought after.'),
  -- Honduras
  ('Honduras Marcala',           'Honduras',        'Marcala',          'Honey',    'Medium',       1500, 'Catuai',         'Brown sugar, caramel apple, clean finish.'),
  -- Nicaragua
  ('Nicaragua Jinotega',         'Nicaragua',       'Jinotega',         'Washed',   'Medium',       1400, 'Bourbon/Caturra','Dark chocolate, cherry, medium body.'),
  -- Indonesia
  ('Sumatra Mandheling',         'Indonesia',       'North Sumatra',    'Wet-Hulled','Dark',        1400, 'Typica/Tim Tim', 'Earthy, tobacco, dark chocolate, full body. Bold and complex.'),
  ('Sulawesi Toraja',            'Indonesia',       'South Sulawesi',   'Wet-Hulled','Dark',        1700, 'Typica',         'Spice, dark fruit, cedar, lingering finish.'),
  -- Hawaii
  ('Kona Extra Fancy',           'USA',             'Kona, Hawaii',     'Washed',   'Medium',        600, 'Kona Typica',    'Smooth, nutty, mild fruit. The prestige cup.'),
  -- China
  ('Yunnan Anaerobic',           'China',           'Yunnan',           'Anaerobic','Light',        1800, 'Catimor',        'Tropical, lychee, cinnamon. Surprising complexity from an unexpected origin.'),
  -- Mexico
  ('Chiapas Organic',            'Mexico',          'Chiapas',          'Washed',   'Medium',       1400, 'Bourbon/Typica', 'Chocolate, almond, mild citrus. Comfort in a cup.'),
  -- Brazil
  ('Brazil Fazenda Ambiental',   'Brazil',          'Mogiana',          'Natural',  'Medium-Light', 1200, 'Yellow Bourbon', 'Chocolate, hazelnut, dried apricot. Reliable and clean.'),
  ('Brazil Cerrado',             'Brazil',          'Cerrado Mineiro',  'Pulped Natural','Medium',  1000, 'Catuai',         'Nuts, milk chocolate, caramel. The espresso workhorse.'),
  -- India
  ('India Monsooned Malabar',    'India',           'Malabar',          'Monsooned','Dark',          600, 'Robusta/Arabica','Musty, earthy, bold, low acid. Unique wet-aging process.')
ON CONFLICT DO NOTHING;

-- ─── SPECIALTY CAFES ──────────────────────────────────────
INSERT INTO cafes (name, slug, address, city, country, lat, lng, is_specialty) VALUES
  ('Petra Roasting Co.',    'petra-roasting-besiktas', 'Sinanpasa Mah., Besiktas',       'Istanbul', 'Turkey', 41.0438, 29.0057, true),
  ('Norm Coffee Karakoy',   'norm-karakoy',            'Kemeraltı Cd., Karakoy',         'Istanbul', 'Turkey', 41.0212, 28.9759, true),
  ('Kronotrop Nisantasi',   'kronotrop-nisantasi',     'Abdi Ipekci Cd., Nisantasi',     'Istanbul', 'Turkey', 41.0475, 28.9942, true),
  ('Coffee Department',     'coffee-department',       'Tomtom Kaptan Sk., Beyoglu',     'Istanbul', 'Turkey', 41.0315, 28.9773, true),
  ('MOC Coffee',            'moc-coffee-beyoglu',      'Balo Sok., Beyoglu',             'Istanbul', 'Turkey', 41.0335, 28.9780, true),
  ('Brew Lab Istanbul',     'brew-lab',                'Cihangir Cd., Cihangir',         'Istanbul', 'Turkey', 41.0320, 28.9800, true),
  ('Cafe Moda',             'cafe-moda',               'Moda Cd., Kadikoy',              'Istanbul', 'Turkey', 40.9876, 29.0246, true),
  ('Velvet Coffee Roasters','velvet-coffee',           'Bagdat Cd., Kadikoy',            'Istanbul', 'Turkey', 40.9720, 29.0610, true),
  ('The Coffee Man',        'the-coffee-man',          'Muammer Karaca Cd., Sisli',      'Istanbul', 'Turkey', 41.0650, 28.9870, true),
  ('Grinder Coffee',        'grinder-coffee',          'Nispetiye Cd., Etiler',          'Istanbul', 'Turkey', 41.0700, 29.0300, true),
  ('Johansen Coffee',       'johansen-istanbul',       'Siraselviler Cd., Taksim',       'Istanbul', 'Turkey', 41.0360, 28.9835, true),
  ('Brew Theory',           'brew-theory',             'Recaizade Sk., Camlica',         'Istanbul', 'Turkey', 41.0180, 29.0500, true),
  ('Monokl Coffee',         'monokl',                  'Kurucesme Cd., Besiktas',        'Istanbul', 'Turkey', 41.0600, 29.0380, true),
  ('Hep Espresso',          'hep-espresso',            'Bozkurt Cd., Sisli',             'Istanbul', 'Turkey', 41.0520, 28.9850, true),
  ('Arabica & Co Ankara',   'arabica-co-ankara',       'Tunali Hilmi Cd., Kavaklidere',  'Ankara',   'Turkey', 39.9030, 32.8615, true),
  ('The Roastery Ankara',   'roastery-ankara',         'Kizilay Mey., Kizilay',          'Ankara',   'Turkey', 39.9110, 32.8590, true),
  ('Atlas Coffee Ankara',   'atlas-ankara',            'Bahcelievler 7.Cd., Ankara',     'Ankara',   'Turkey', 39.9208, 32.8160, true),
  ('Kaplumbaga Roastery',   'kaplumbaga-izmir',        'Kibris Sehitleri Cd., Alsancak', 'Izmir',    'Turkey', 38.4380, 27.1380, true),
  ('Brew Society Izmir',    'brew-society-izmir',      'Kordon Cd., Karsiyaka',          'Izmir',    'Turkey', 38.4720, 27.1110, true),
  ('Norm Coffee Nisantasi', 'norm-nisantasi',          'Akkavak Sk., Nisantasi',         'Istanbul', 'Turkey', 41.0490, 28.9960, true)
ON CONFLICT (slug) DO NOTHING;
