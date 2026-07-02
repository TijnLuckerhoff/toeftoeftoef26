const COMPACT_MATCH_MIN_LENGTH = 4;

export function findAllergenMatches(text, selectedAllergens, allergens) {
	const normalized = ` ${normalizeForMatch(text)} `;
	const compact = normalizeCompact(text);

	return selectedAllergens
		.map((id) => allergens.find((allergen) => allergen.id === id))
		.filter(Boolean)
		.map((allergen) => {
			const terms = allergen.terms.filter((term) => termMatches(term, normalized, compact));
			if (!terms.length) return null;

			const cautionTerms = terms.filter((term) => allergen.cautionTerms?.includes(term));
			const strongTerms = terms.filter((term) => !allergen.cautionTerms?.includes(term));

			return {
				...allergen,
				matchedTerms: terms,
				cautionTerms,
				severity: strongTerms.length ? 'danger' : 'caution'
			};
		})
		.filter(Boolean);
}

export function normalizeWhitespace(value) {
	return value.replace(/\s+/g, ' ').trim();
}

export function normalizeForMatch(value) {
	return value
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

function termMatches(term, normalizedText, compactText) {
	const normalizedTerm = normalizeForMatch(term);
	const safeTerm = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

	// Exact word-boundary match
	const hasWordMatch = new RegExp(`(^|[^a-z0-9])${safeTerm}([^a-z0-9]|$)`, 'i').test(
		normalizedText
	);
	if (hasWordMatch) return true;

	// Prefix match: term starts a compound word ("melk" in "melkpoeder", "appel" in "appelmoes")
	if (normalizedTerm.length >= 4) {
		const hasPrefixMatch = new RegExp(`(^|[^a-z0-9])${safeTerm}[a-z0-9]`, 'i').test(
			normalizedText
		);
		if (hasPrefixMatch) return true;
	}

	// Compact whole-text substring match (handles spaces between parts of compound words)
	const compactTerm = normalizeCompact(term);
	return compactTerm.length >= COMPACT_MATCH_MIN_LENGTH && compactText.includes(compactTerm);
}

function normalizeCompact(value) {
	return normalizeForMatch(value).replace(/\s+/g, '');
}
