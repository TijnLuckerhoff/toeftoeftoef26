import { describe, expect, it } from 'vitest';
import { findAllergenMatches } from './allergenMatch.js';

const allergens = [
	{ id: 'cocoa', name: 'Cacao', terms: ['cocoa', 'cacao', 'cacaoboter', 'chocolate', 'chocolade'] },
	{ id: 'pea', name: 'Pea', terms: ['pea', 'peas', 'erwt', 'erwten'] },
	{
		id: 'gluten',
		name: 'Gluten',
		terms: ['gluten', 'tarwe', 'malt', 'mout'],
		cautionTerms: ['malt', 'mout']
	}
];

describe('findAllergenMatches', () => {
	it('matches OCR text when spaces disappear inside ingredient words', () => {
		const matches = findAllergenMatches(
			'ingredients sugar milkchocolate cocoabutter lactose',
			['cocoa'],
			allergens
		);

		expect(matches).toHaveLength(1);
		expect(matches[0].matchedTerms).toEqual(['cocoa', 'chocolate']);
	});

	it('keeps short terms from matching inside unrelated longer words', () => {
		const matches = findAllergenMatches('contains peanut and cocoa', ['pea'], allergens);

		expect(matches).toEqual([]);
	});

	it('matches Dutch compound ingredient words such as cacaoboter', () => {
		const matches = findAllergenMatches('ingredienten suiker cacaoboter melkpoeder', ['cocoa'], allergens);

		expect(matches).toHaveLength(1);
		expect(matches[0].matchedTerms).toContain('cacaoboter');
	});

	it('marks vague gluten terms such as malt as caution', () => {
		const matches = findAllergenMatches('ingredienten zoetstof malt aroma', ['gluten'], allergens);

		expect(matches).toHaveLength(1);
		expect(matches[0].severity).toBe('caution');
		expect(matches[0].cautionTerms).toEqual(['malt']);
	});

	it('does not match malt inside maltitol as gluten', () => {
		const matches = findAllergenMatches('ingredienten sorbitol maltitol aroma', ['gluten'], allergens);

		expect(matches).toEqual([]);
	});
});
