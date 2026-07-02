import { JSONFilePreset } from 'lowdb/node';

export const allergens = [
  { id: 'milk', name: 'Melk / lactose', terms: ['milk', 'melk', 'lactose', 'wei', 'whey', 'casein', 'kaas', 'cream', 'butter'] },
  { id: 'egg', name: 'Ei', terms: ['egg', 'ei', 'eggs', 'albumen', 'albumin', 'eigeel', 'eier'] },
  { id: 'peanut', name: 'Pinda', terms: ['peanut', 'pinda', 'arachis', 'groundnut', 'satay'] },
  { id: 'tree-nut', name: 'Boomnoten', terms: ['nut', 'nuts', 'noten', 'almond', 'amandel', 'hazelnut', 'hazelnoot', 'walnut', 'walnoot', 'cashew', 'pistachio', 'pecan', 'macadamia'] },
  { id: 'soy', name: 'Soja', terms: ['soy', 'soya', 'soja', 'soybean', 'sojalecithine', 'lecithin'] },
  { id: 'wheat', name: 'Tarwe', terms: ['wheat', 'tarwe', 'gluten', 'flour', 'bloem', 'semolina', 'spelt'] },
  { id: 'gluten', name: 'Gluten', terms: ['gluten', 'tarwe', 'wheat', 'barley', 'gerst', 'rye', 'rogge', 'spelt', 'malt', 'mout'], cautionTerms: ['malt', 'mout'] },
  { id: 'fish', name: 'Vis', terms: ['fish', 'vis', 'anchovy', 'ansjovis', 'cod', 'kabeljauw', 'salmon', 'zalm', 'tuna', 'tonijn'] },
  { id: 'shellfish', name: 'Schaaldieren', terms: ['shellfish', 'crustacean', 'schaaldieren', 'shrimp', 'garnaal', 'prawn', 'crab', 'krab', 'lobster', 'kreeft'] },
  { id: 'mollusc', name: 'Weekdieren', terms: ['mollusc', 'mollusk', 'weekdieren', 'mussel', 'mossel', 'oyster', 'oester', 'squid', 'inktvis'] },
  { id: 'sesame', name: 'Sesam', terms: ['sesame', 'sesam', 'tahini'] },
  { id: 'mustard', name: 'Mosterd', terms: ['mustard', 'mosterd'] },
  { id: 'celery', name: 'Selderij', terms: ['celery', 'selderij', 'celeriac'] },
  { id: 'lupin', name: 'Lupin', terms: ['lupin', 'lupine'] },
  { id: 'sulphites', name: 'Sulfiet', terms: ['sulphite', 'sulfite', 'sulfiet', 'sulphur dioxide', 'zwaveldioxide', 'e220', 'e221', 'e222', 'e223', 'e224', 'e226', 'e227', 'e228'] },
  { id: 'corn', name: 'Mais', terms: ['corn', 'maize', 'mais', 'cornstarch', 'maizena'] },
  { id: 'oat', name: 'Haver', terms: ['oat', 'oats', 'haver'] },
  { id: 'barley', name: 'Gerst', terms: ['barley', 'gerst', 'malt', 'mout'] },
  { id: 'rye', name: 'Rogge', terms: ['rye', 'rogge'] },
  { id: 'buckwheat', name: 'Boekweit', terms: ['buckwheat', 'boekweit'] },
  { id: 'kiwi', name: 'Kiwi', terms: ['kiwi'] },
  { id: 'banana', name: 'Banaan', terms: ['banana', 'banaan'] },
  { id: 'strawberry', name: 'Aardbei', terms: ['strawberry', 'aardbei'] },
  { id: 'tomato', name: 'Tomaat', terms: ['tomato', 'tomaat'] },
  { id: 'cocoa', name: 'Cacao', terms: ['cocoa', 'cacao', 'cacaoboter', 'cocoa butter', 'cacaomassa', 'cocoa mass', 'chocolate', 'chocolade', 'chocoladepoeder'] },
  { id: 'coconut', name: 'Kokos', terms: ['coconut', 'kokos'] },
  { id: 'almond', name: 'Amandel', terms: ['almond', 'amandel'] },
  { id: 'hazelnut', name: 'Hazelnoot', terms: ['hazelnut', 'hazelnoot'] },
  { id: 'walnut', name: 'Walnoot', terms: ['walnut', 'walnoot'] },
  { id: 'cashew', name: 'Cashew', terms: ['cashew'] },
  { id: 'pistachio', name: 'Pistachio', terms: ['pistachio', 'pistache'] },
  { id: 'pecan', name: 'Pecan', terms: ['pecan'] },
  { id: 'macadamia', name: 'Macadamia', terms: ['macadamia'] },
  { id: 'pine-nut', name: 'Pijnboompit', terms: ['pine nut', 'pijnboompit'] },
  { id: 'sunflower', name: 'Zonnebloempit', terms: ['sunflower', 'zonnebloem', 'zonnebloempit'] },
  { id: 'pumpkin', name: 'Pompoenpit', terms: ['pumpkin seed', 'pompoenpit'] },
  { id: 'chickpea', name: 'Kikkererwt', terms: ['chickpea', 'kikkererwt', 'hummus'] },
  { id: 'lentil', name: 'Linzen', terms: ['lentil', 'linzen', 'linze'] },
  { id: 'pea', name: 'Erwt', terms: ['pea', 'peas', 'erwt', 'erwten'] },
  { id: 'bean', name: 'Bonen', terms: ['bean', 'beans', 'boon', 'bonen'] },
  { id: 'garlic', name: 'Knoflook', terms: ['garlic', 'knoflook'] },
  { id: 'onion', name: 'Ui', terms: ['onion', 'ui', 'uien'] },
  { id: 'carrot', name: 'Wortel', terms: ['carrot', 'wortel'] },
  { id: 'apple', name: 'Appel', terms: ['apple', 'appel'] },
  { id: 'citrus', name: 'Citrus', terms: ['citrus', 'orange', 'sinaasappel', 'lemon', 'citroen', 'lime', 'limoen'] },
  { id: 'mushroom', name: 'Paddenstoel', terms: ['mushroom', 'champignon', 'paddenstoel'] },
  { id: 'yeast', name: 'Gist', terms: ['yeast', 'gist'] },
  { id: 'gelatin', name: 'Gelatine', terms: ['gelatin', 'gelatine'] },
  { id: 'aspartame', name: 'Aspartame', terms: ['aspartame', 'aspartaam', 'e951'] },
  { id: 'msg', name: 'MSG', terms: ['msg', 'monosodium glutamate', 'mononatriumglutamaat', 'e621'] }
];

const defaultData = {
  meta: {
    title: 'Allergies Detect prototype',
    warning: 'Prototype only: false positives and false negatives are expected.'
  },
  profiles: {
    default: {
      selectedAllergens: [],
      highContrast: true,
      largeText: false,
      speechEnabled: true,
      cameraFacingMode: 'environment',
      updatedAt: null
    }
  }
};

const db = await JSONFilePreset('db.json', defaultData);

if (!db.data.profiles) {
  db.data = defaultData;
  await db.write();
}

export function getPrototypeInfo(req, res) {
  res.status(200).json({
    name: 'Allergies Detect API',
    prototype: true,
    endpoints: ['/api/allergens', '/api/profile', '/api/scan-text']
  });
}

export function getAllergens(req, res) {
  res.status(200).json({ allergens });
}

export function getProfile(req, res) {
  res.status(200).json(db.data.profiles.default);
}

export async function saveProfile(req, res) {
  const selectedAllergens = Array.isArray(req.body.selectedAllergens)
    ? req.body.selectedAllergens.filter((id) => allergens.some((allergen) => allergen.id === id))
    : [];

  db.data.profiles.default = {
    selectedAllergens,
    highContrast: req.body.highContrast ?? true,
    largeText: req.body.largeText ?? false,
    speechEnabled: req.body.speechEnabled ?? true,
    cameraFacingMode: req.body.cameraFacingMode === 'user' ? 'user' : 'environment',
    updatedAt: new Date().toISOString()
  };

  await db.write();
  res.status(200).json(db.data.profiles.default);
}

export function scanText(req, res) {
  const text = String(req.body.text ?? '');
  const selectedAllergens = Array.isArray(req.body.selectedAllergens) ? req.body.selectedAllergens : [];

  res.status(200).json({
    matches: findMatches(text, selectedAllergens),
    prototype: true
  });
}

export async function getProductByBarcode(req, res) {
  const barcode = String(req.params.barcode ?? '').replace(/\D/g, '');

  if (!barcode) {
    res.status(400).json({ found: false, message: 'Geen geldige barcode ontvangen.' });
    return;
  }

  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
      headers: {
        'User-Agent': 'AllergiesDetectPrototype/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Open Food Facts status ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== 1 || !data.product) {
      res.status(404).json({ barcode, found: false, message: 'Product niet gevonden.' });
      return;
    }

    const product = data.product;
    const productNameText = firstTextValue([
      product.product_name_nl,
      product.product_name,
      product.product_name_en,
      product.product_name_fr,
      product.product_name_de,
      product.abbreviated_product_name,
      product.generic_name_nl,
      product.generic_name,
      product.generic_name_en,
      product.brands
    ]);
    const ingredientsText = firstTextValue([
      product.ingredients_text_nl,
      product.ingredients_text,
      product.ingredients_text_en,
      product.ingredients_text_fr,
      product.ingredients_text_de,
      product.ingredients_text_with_allergens_nl,
      product.ingredients_text_with_allergens,
      product.ingredients_text_with_allergens_en
    ]);
    const allergenText = [
      product.allergens,
      product.allergens_from_ingredients,
      product.traces,
      ...(product.allergens_tags || []),
      ...(product.traces_tags || [])
    ]
      .filter(Boolean)
      .join(' ');
    const matchText = [
      productNameText,
      ingredientsText,
      allergenText
    ]
      .filter(Boolean)
      .join(' ');

    res.status(200).json({
      barcode,
      found: true,
      name: productNameText || `Product ${barcode}`,
      brand: product.brands || '',
      quantity: product.quantity || '',
      ingredientsText,
      allergenText,
      matchText,
      source: 'Open Food Facts'
    });
  } catch (error) {
    res.status(502).json({
      barcode,
      found: false,
      message: 'Productinformatie kon niet worden opgehaald.',
      detail: error.message
    });
  }
}

function firstTextValue(values) {
  return values
    .map((value) => String(value || '').trim())
    .find((value) => value && value.toLowerCase() !== 'unknown') || '';
}

function findMatches(text, selectedAllergens) {
  const normalized = ` ${normalizeForMatch(text)} `;
  const compact = normalizeCompact(text);

  return selectedAllergens
    .map((id) => allergens.find((allergen) => allergen.id === id))
    .filter(Boolean)
    .map((allergen) => {
      const matchedTerms = allergen.terms.filter((term) => {
        const normalizedTerm = normalizeForMatch(term);
        const safeTerm = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordMatch = new RegExp(`(^|[^a-z0-9])${safeTerm}([^a-z0-9]|$)`, 'i').test(
          normalized
        );

        if (wordMatch) return true;

        const compactTerm = normalizeCompact(term);
        return compactTerm.length >= 5 && compact.includes(compactTerm);
      });

      if (!matchedTerms.length) return null;

      const cautionTerms = matchedTerms.filter((term) => allergen.cautionTerms?.includes(term));
      const strongTerms = matchedTerms.filter((term) => !allergen.cautionTerms?.includes(term));

      return {
        id: allergen.id,
        name: allergen.name,
        matchedTerms,
        cautionTerms,
        severity: strongTerms.length ? 'danger' : 'caution'
      };
    })
    .filter(Boolean);
}

function normalizeCompact(value) {
  return normalizeForMatch(value).replace(/\s+/g, '');
}

function normalizeForMatch(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
