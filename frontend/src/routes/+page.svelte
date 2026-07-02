<script>
	import { onDestroy, onMount, tick } from 'svelte';
	import { BrowserMultiFormatReader } from '@zxing/browser';
	import { BarcodeFormat, DecodeHintType } from '@zxing/library';
	import { createWorker } from 'tesseract.js';
	import { findAllergenMatches, normalizeWhitespace } from '$lib/allergenMatch.js';
	import creditsMarkdown from '$lib/credits.md?raw';
	import { Capacitor } from '@capacitor/core';
	import { TextToSpeech } from '@capacitor-community/text-to-speech';
	import { Ocr } from '@jcesarmobile/capacitor-ocr';

	const STORAGE_KEY = 'allergies-detect-profile';

	const allergenCategories = [
		{
			id: 'main',
			name: 'Belangrijkste allergenen',
			allergenIds: [
				'milk',
				'egg',
				'peanut',
				'tree-nut',
				'soy',
				'wheat',
				'gluten',
				'fish',
				'shellfish',
				'mollusc',
				'sesame',
				'mustard',
				'celery',
				'lupin',
				'sulphites'
			]
		},
		{
			id: 'grains',
			name: 'Granen en zetmeel',
			allergenIds: ['corn', 'oat', 'barley', 'rye', 'buckwheat']
		},
		{
			id: 'nuts-seeds',
			name: 'Noten en zaden',
			allergenIds: [
				'almond',
				'hazelnut',
				'walnut',
				'cashew',
				'pistachio',
				'pecan',
				'macadamia',
				'pine-nut',
				'sunflower',
				'pumpkin'
			]
		},
		{
			id: 'legumes',
			name: 'Peulvruchten',
			allergenIds: ['chickpea', 'lentil', 'pea', 'bean']
		},
		{
			id: 'fruit-veg',
			name: 'Groente, fruit en planten',
			allergenIds: [
				'kiwi',
				'banana',
				'strawberry',
				'tomato',
				'coconut',
				'garlic',
				'onion',
				'carrot',
				'apple',
				'citrus',
				'mushroom'
			]
		},
		{
			id: 'other',
			name: 'Overig en additieven',
			allergenIds: ['cocoa', 'yeast', 'gelatin', 'aspartame', 'msg']
		}
	];

	const defaultAllergens = [
		{
			id: 'milk',
			name: 'Melk / lactose',
			aliases: ['zuivel', 'kaas', 'boter', 'room', 'yoghurt', 'kwark', 'lactose', 'melkpoeder'],
			terms: [
				'milk',
				'melk',
				'lactose',
				'wei',
				'whey',
				'casein',
				'caseinate',
				'kaas',
				'cream',
				'butter',
				'karnemelk',
				'botermelk',
				'slagroom'
			]
		},
		{
			id: 'egg',
			name: 'Ei',
			aliases: ['eieren', 'eigeel', 'eiwit', 'mayonaise'],
			terms: [
				'egg',
				'ei',
				'eggs',
				'eieren',
				'eidooier',
				'eiwit',
				'eigeel',
				'eipoeder',
				'albumen',
				'albumin',
				'eier'
			]
		},
		{
			id: 'peanut',
			name: 'Pinda',
			aliases: ['noten', 'noot', 'pindanoot', 'pindanoten', 'pindakaas'],
			terms: ['peanut', 'pinda', 'arachis', 'groundnut', 'satay']
		},
		{
			id: 'tree-nut',
			name: 'Boomnoten',
			aliases: ['noten', 'noot', 'boomnoot', 'gemengde noten'],
			terms: [
				'nut',
				'nuts',
				'noten',
				'almond',
				'amandel',
				'hazelnut',
				'hazelnoot',
				'walnut',
				'walnoot',
				'cashew',
				'pistachio',
				'pecan',
				'macadamia'
			]
		},
		{
			id: 'soy',
			name: 'Soja',
			aliases: ['sojamelk', 'tofu', 'tempeh', 'edamame', 'miso'],
			terms: ['soy', 'soya', 'soja', 'soybean', 'sojalecithine', 'lecithin']
		},
		{
			id: 'wheat',
			name: 'Tarwe',
			aliases: ['brood', 'meel', 'pasta', 'beschuit'],
			terms: ['wheat', 'tarwe', 'gluten', 'flour', 'bloem', 'semolina', 'spelt']
		},
		{
			id: 'gluten',
			name: 'Gluten',
			aliases: ['graan', 'brood', 'meel', 'granen', 'bloem'],
			terms: [
				'gluten',
				'tarwe',
				'wheat',
				'barley',
				'gerst',
				'rye',
				'rogge',
				'spelt',
				'malt',
				'mout'
			],
			cautionTerms: ['malt', 'mout']
		},
		{
			id: 'fish',
			name: 'Vis',
			aliases: ['vissen', 'zeevis', 'visolie', 'zeevruchten', 'vissoort'],
			terms: [
				'fish',
				'vis',
				'anchovy',
				'ansjovis',
				'cod',
				'kabeljauw',
				'salmon',
				'zalm',
				'tuna',
				'tonijn'
			]
		},
		{
			id: 'shellfish',
			name: 'Schaaldieren',
			aliases: ['garnalen', 'kreeft', 'krab', 'zeevruchten', 'seafood'],
			terms: [
				'shellfish',
				'crustacean',
				'schaaldieren',
				'shrimp',
				'garnaal',
				'prawn',
				'crab',
				'krab',
				'lobster',
				'kreeft'
			]
		},
		{
			id: 'mollusc',
			name: 'Weekdieren',
			aliases: ['mosselen', 'oesters', 'inktvis', 'zeevruchten', 'seafood'],
			terms: [
				'mollusc',
				'mollusk',
				'weekdieren',
				'mussel',
				'mossel',
				'oyster',
				'oester',
				'squid',
				'inktvis'
			]
		},
		{
			id: 'sesame',
			name: 'Sesam',
			aliases: ['sesamzaad', 'sesamolie', 'goma', 'tahini'],
			terms: ['sesame', 'sesam', 'tahini']
		},
		{
			id: 'mustard',
			name: 'Mosterd',
			aliases: ['mosterdzaad', 'tafelmost'],
			terms: ['mustard', 'mosterd']
		},
		{
			id: 'celery',
			name: 'Selderij',
			aliases: ['knolselderij', 'bleekselderij', 'selderie'],
			terms: ['celery', 'selderij', 'celeriac']
		},
		{
			id: 'lupin',
			name: 'Lupin',
			aliases: ['lupinezaad', 'lupinebloem', 'lupinemeel'],
			terms: ['lupin', 'lupine']
		},
		{
			id: 'sulphites',
			name: 'Sulfiet',
			aliases: ['zwavel', 'zwaveldioxide', 'wijn', 'e220', 'conserveringsmiddel'],
			terms: [
				'sulphite',
				'sulfite',
				'sulfiet',
				'sulphur dioxide',
				'zwaveldioxide',
				'e220',
				'e221',
				'e222',
				'e223',
				'e224',
				'e226',
				'e227',
				'e228'
			]
		},
		{
			id: 'corn',
			name: 'Mais',
			aliases: ['maïs', 'popcorn', 'tortilla', 'maizena', 'zetmeel'],
			terms: ['corn', 'maize', 'mais', 'cornstarch', 'maizena']
		},
		{
			id: 'oat',
			name: 'Haver',
			aliases: ['havermout', 'granola', 'muesli', 'havermelk', 'graan'],
			terms: ['oat', 'oats', 'haver']
		},
		{
			id: 'barley',
			name: 'Gerst',
			aliases: ['mout', 'bier', 'graan', 'whisky'],
			terms: ['barley', 'gerst', 'malt', 'mout']
		},
		{
			id: 'rye',
			name: 'Rogge',
			aliases: ['roggebrood', 'graan', 'granen'],
			terms: ['rye', 'rogge']
		},
		{
			id: 'buckwheat',
			name: 'Boekweit',
			aliases: ['boekweitmeel', 'pannenkoek', 'graan'],
			terms: ['buckwheat', 'boekweit']
		},
		{ id: 'kiwi', name: 'Kiwi', aliases: ['kiwifruit', 'fruit'], terms: ['kiwi'] },
		{
			id: 'banana',
			name: 'Banaan',
			aliases: ['bananen', 'fruit'],
			terms: ['banana', 'banaan', 'bananen', 'bananenpuree', 'banaanpoeder']
		},
		{
			id: 'strawberry',
			name: 'Aardbei',
			aliases: ['aardbeien', 'fruit', 'bessen'],
			terms: ['strawberry', 'aardbei']
		},
		{
			id: 'tomato',
			name: 'Tomaat',
			aliases: ['tomaten', 'ketchup', 'tomatensaus', 'groente'],
			terms: ['tomato', 'tomaat', 'tomaten', 'tomatenpuree', 'tomatensap', 'tomatensaus']
		},
		{
			id: 'cocoa',
			name: 'Cacao',
			aliases: ['chocola', 'chocolade', 'cacaopoeder', 'cacaoboter'],
			terms: [
				'cocoa',
				'cacao',
				'cacaoboter',
				'cocoa butter',
				'cacaomassa',
				'cocoa mass',
				'chocolate',
				'chocolade',
				'chocoladepoeder'
			]
		},
		{
			id: 'coconut',
			name: 'Kokos',
			aliases: ['kokosnoot', 'kokosmelk', 'kokosolie', 'noten', 'noot'],
			terms: ['coconut', 'kokos']
		},
		{
			id: 'almond',
			name: 'Amandel',
			aliases: ['amandelmelk', 'noten', 'noot'],
			terms: ['almond', 'amandel']
		},
		{
			id: 'hazelnut',
			name: 'Hazelnoot',
			aliases: ['noten', 'noot'],
			terms: ['hazelnut', 'hazelnoot']
		},
		{ id: 'walnut', name: 'Walnoot', aliases: ['noten', 'noot'], terms: ['walnut', 'walnoot'] },
		{ id: 'cashew', name: 'Cashew', aliases: ['cashewnoot', 'noten', 'noot'], terms: ['cashew'] },
		{
			id: 'pistachio',
			name: 'Pistachio',
			aliases: ['pistachenoot', 'noten', 'noot'],
			terms: ['pistachio', 'pistache']
		},
		{ id: 'pecan', name: 'Pecan', aliases: ['pecannoot', 'noten', 'noot'], terms: ['pecan'] },
		{
			id: 'macadamia',
			name: 'Macadamia',
			aliases: ['macadamianoot', 'noten', 'noot'],
			terms: ['macadamia']
		},
		{
			id: 'pine-nut',
			name: 'Pijnboompit',
			aliases: ['noten', 'noot', 'dennenpit', 'pijnboomnoot'],
			terms: ['pine nut', 'pijnboompit']
		},
		{
			id: 'sunflower',
			name: 'Zonnebloempit',
			aliases: ['zonnebloem', 'zaad', 'pit', 'zaden'],
			terms: ['sunflower', 'zonnebloem', 'zonnebloempit']
		},
		{
			id: 'pumpkin',
			name: 'Pompoenpit',
			aliases: ['pompoen', 'zaad', 'pit', 'zaden'],
			terms: ['pumpkin seed', 'pompoenpit']
		},
		{
			id: 'chickpea',
			name: 'Kikkererwt',
			aliases: ['hummus', 'peulvrucht', 'kikkererwten', 'falafel'],
			terms: ['chickpea', 'kikkererwt', 'hummus']
		},
		{
			id: 'lentil',
			name: 'Linzen',
			aliases: ['linze', 'peulvrucht', 'dal', 'soep'],
			terms: ['lentil', 'linzen', 'linze']
		},
		{
			id: 'pea',
			name: 'Erwt',
			aliases: ['erwten', 'peulvrucht', 'doperwt', 'spliterwt'],
			terms: ['pea', 'peas', 'erwt', 'erwten']
		},
		{
			id: 'bean',
			name: 'Bonen',
			aliases: ['boon', 'peulvrucht', 'bruine bonen', 'kidney', 'sperzieboon'],
			terms: ['bean', 'beans', 'boon', 'bonen']
		},
		{
			id: 'garlic',
			name: 'Knoflook',
			aliases: ['look', 'knof', 'groente', 'knoflookpoeder'],
			terms: ['garlic', 'knoflook']
		},
		{
			id: 'onion',
			name: 'Ui',
			aliases: ['uien', 'sjalot', 'prei', 'bieslook', 'groente'],
			terms: ['onion', 'ui', 'uien']
		},
		{
			id: 'carrot',
			name: 'Wortel',
			aliases: ['wortelen', 'worteltje', 'groente', 'wortelsoep'],
			terms: ['carrot', 'wortel']
		},
		{
			id: 'apple',
			name: 'Appel',
			aliases: ['appels', 'fruit', 'appelmoes', 'appelsap'],
			terms: ['apple', 'appel']
		},
		{
			id: 'citrus',
			name: 'Citrus',
			aliases: ['mandarijn', 'clementine', 'grapefruit', 'pompelmoes'],
			terms: ['citrus', 'orange', 'sinaasappel', 'lemon', 'citroen', 'lime', 'limoen']
		},
		{
			id: 'mushroom',
			name: 'Paddenstoel',
			aliases: ['champignons', 'fungi', 'paddenstoelen', 'schimmel'],
			terms: ['mushroom', 'champignon', 'paddenstoel']
		},
		{
			id: 'yeast',
			name: 'Gist',
			aliases: ['gistextract', 'brood', 'bier', 'fermentatie'],
			terms: ['yeast', 'gist']
		},
		{
			id: 'gelatin',
			name: 'Gelatine',
			aliases: ['dierlijk', 'collageen', 'geleermiddel', 'snoep'],
			terms: ['gelatin', 'gelatine']
		},
		{
			id: 'aspartame',
			name: 'Aspartame',
			aliases: ['zoetmiddel', 'suikervervanger', 'e951', 'light'],
			terms: ['aspartame', 'aspartaam', 'e951']
		},
		{
			id: 'msg',
			name: 'MSG',
			aliases: ['smaakversterker', 'glutamaat', 'umami', 'e621', 'chinees'],
			terms: ['msg', 'monosodium glutamate', 'mononatriumglutamaat', 'e621']
		}
	];

	let allergens = defaultAllergens;
	let selectedAllergens = [];
	let mode = 'setup';
	let highContrast = true;
	let largeText = false;
	let speechEnabled = false;
	let menuOpen = false;
	let menuView = 'main';
	let appScale = 100;
	let allergenSearch = '';
	let isOnline = true;
	let wifiWarningSpoken = false;
	let cameraFacingMode = 'environment';
	let backendStatus = 'Offline allergenenlijst wordt gebruikt.';
	let manualBarcode = '';
	let barcodeStatus = 'Geen barcode ingevoerd.';
	let barcodeSupported = true;
	let barcodeBusy = false;
	let barcodeFrame = null;
	let detectedBarcode = '';
	let barcodeLocked = false;
	let ocrConfidence = 0;
	let ocrOnlyMode = false;
	let canScanIngredients = false;
	let barcodeSnapshot = '';
	let productName = '';
	let productMeta = '';
	let productIngredients = '';
	let productLookupBusy = false;
	let productStatus = 'Nog geen product gevonden.';
	let cameraReady = false;
	let cameraLoading = false;
	let scanning = false;
	let ocrBusy = false;
	let workerReady = false;
	let ocrProgress = 0;
	let ocrLastCandidate = '';
	let ocrConsistentCount = 0;
	let ocrTextStableCount = 0;
	let ocrSnapshot = '';
	let ingredientDebugMode = false;
	let barcodeDebugMode = false;
	let debugResultVisible = false;
	let debugResumeMode = '';
	let debugAutoCapture = false;
	let debugCaptureInterval = 750;
	let ocrEngine = '';
	let ocrRawText = '';
	let debugCaptureCount = 0;
	let lastDebugBarcodeAt = 0;
	let status = 'Stel eerst je allergieprofiel in.';
	let guidance = 'De camera is nog niet actief.';
	let extractedText = '';
	let matchedAllergens = [];
	let lastSpoken = '';
	let lastGuidanceAt = 0;
	let lastVisibleGuidanceAt = 0;
	let barcodeTimer;
	let ocrTimer;
	let stream;
	let worker;
	let zxingReader;
	let barcodeDetector;
	let video;
	let canvas;

	$: selectedNames = selectedAllergens
		.map((id) => allergens.find((allergen) => allergen.id === id)?.name)
		.filter(Boolean)
		.join(', ');

	$: categorizedAllergens = allergenCategories
		.map((category) => ({
			...category,
			allergens: category.allergenIds
				.map((id) => allergens.find((allergen) => allergen.id === id))
				.filter(Boolean)
				.sort((a, b) => a.name.localeCompare(b.name, 'nl', { sensitivity: 'base' }))
		}))
		.filter((category) => category.allergens.length);

	$: filteredCategorizedAllergens = categorizedAllergens
		.map((category) => ({
			...category,
			allergens: category.allergens.filter((allergen) => {
				const q = allergenSearch.trim().toLowerCase();
				if (!q) return true;
				return (
					allergen.name.toLowerCase().includes(q) ||
					allergen.aliases?.some((a) => a.toLowerCase().includes(q))
				);
			})
		}))
		.filter((category) => category.allergens.length);

	$: appClasses = [
		'min-h-screen',
		'transition-colors',
		highContrast ? 'bg-black text-white' : 'bg-slate-50 text-slate-950'
	].join(' ');

	$: if (typeof document !== 'undefined') {
		document.documentElement.style.fontSize = `${Math.round(appScale * (largeText ? 1.25 : 1))}%`;
	}
	$: creditBlocks = parseCreditsMarkdown(creditsMarkdown);

	$: if (!isOnline && speechEnabled && !wifiWarningSpoken) {
		wifiWarningSpoken = true;
		speak('Geen wifi beschikbaar. Productinformatie kan beperkt zijn.');
	}

	$: if (isOnline) {
		wifiWarningSpoken = false;
	}

	onMount(async () => {
		isOnline = navigator.onLine;
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		// Pre-load TTS voices so they're available on first speak() call (esp. Android WebView).
		if (typeof speechSynthesis !== 'undefined') {
			speechSynthesis.getVoices();
			speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
		}

		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				selectedAllergens = parsed.selectedAllergens ?? [];
				highContrast = parsed.highContrast ?? true;
				largeText = parsed.largeText ?? false;
				speechEnabled = parsed.speechEnabled ?? false;
				appScale = parsed.appScale ?? 100;
				cameraFacingMode = parsed.cameraFacingMode ?? 'environment';
			} catch {
				localStorage.removeItem(STORAGE_KEY);
			}
		}

		await loadBackendState();
	});

	onDestroy(() => {
		window.removeEventListener('online', handleOnline);
		window.removeEventListener('offline', handleOffline);
		stopScanning();
		if (worker) worker.terminate();
	});

	function handleOnline() {
		isOnline = true;
	}

	function handleOffline() {
		isOnline = false;
	}

	async function loadBackendState() {
		try {
			const [allergensResponse, profileResponse] = await Promise.all([
				fetch('/api/allergens'),
				fetch('/api/profile')
			]);

			if (!allergensResponse.ok || !profileResponse.ok) {
				throw new Error('Backend returned an error.');
			}

			const allergensData = await allergensResponse.json();
			const profile = await profileResponse.json();
			if (Array.isArray(allergensData.allergens) && allergensData.allergens.length) {
				allergens = allergensData.allergens;
			}

			if (!savedProfileExists()) {
				selectedAllergens = profile.selectedAllergens ?? [];
				highContrast = profile.highContrast ?? true;
				largeText = profile.largeText ?? false;
				speechEnabled = profile.speechEnabled ?? false;
				appScale = profile.appScale ?? 100;
				cameraFacingMode = profile.cameraFacingMode ?? 'environment';
			}

			backendStatus = 'Backend verbonden. Profielsync is actief.';
		} catch (error) {
			backendStatus =
				'Backend niet bereikbaar. Lokaal profiel en offline allergenenlijst worden gebruikt.';
			console.info(error);
		}
	}

	function savedProfileExists() {
		return Boolean(localStorage.getItem(STORAGE_KEY));
	}

	async function saveProfile() {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				selectedAllergens,
				highContrast,
				largeText,
				speechEnabled,
				appScale,
				cameraFacingMode
			})
		);
		status = `Profiel opgeslagen met ${selectedAllergens.length} allergenen.`;

		try {
			const response = await fetch('/api/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					selectedAllergens,
					highContrast,
					largeText,
					speechEnabled,
					appScale,
					cameraFacingMode
				})
			});

			if (!response.ok) throw new Error('Profiel opslaan mislukt.');
			backendStatus = 'Backend verbonden. Profielsync is actief.';
		} catch (error) {
			backendStatus = 'Profiel lokaal opgeslagen. Start de backend om te synchroniseren.';
			console.info(error);
		}
	}

	function toggleAllergen(id) {
		selectedAllergens = selectedAllergens.includes(id)
			? selectedAllergens.filter((selected) => selected !== id)
			: [...selectedAllergens, id];
	}

	function selectAllAllergens() {
		selectedAllergens = allergens.map((allergen) => allergen.id);
	}

	function deselectAllAllergens() {
		selectedAllergens = [];
	}

	function openMenu(view = 'main') {
		menuView = view;
		menuOpen = true;
	}

	function toggleHighContrast() {
		highContrast = !highContrast;
		saveProfile();
	}

	function toggleLargeText() {
		largeText = !largeText;
		saveProfile();
	}

	function toggleSpeech() {
		speechEnabled = !speechEnabled;
		saveProfile();
		// Speak confirmation from within this click handler (user gesture) to unlock
		// Android WebView TTS so subsequent automatic calls also work.
		if (speechEnabled) speak('Spraak ingeschakeld.');
	}

	async function beginScanning() {
		if (!selectedAllergens.length) {
			status = 'Kies minimaal een allergeen voordat je scant.';
			speak(status);
			return;
		}

		await saveProfile();
		mode = 'scanning';
		await startCamera();
	}

	async function switchCamera() {
		cameraFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
		if (scanning) {
			cameraLoading = true;
			if (ocrOnlyMode) {
				await startCameraSession('Camera gewisseld. Richt op de ingrediëntenlijst.');
			} else if (barcodeDebugMode) {
				await startCameraSession('Debug barcodecamera klaar. Richt op de barcode.');
			} else {
				await startCamera();
			}
		}
	}

	function returnToSelection() {
		stopScanning();
		ingredientDebugMode = false;
		barcodeDebugMode = false;
		debugResultVisible = false;
		debugResumeMode = '';
		mode = 'setup';
	}

	async function startCamera() {
		if (!selectedAllergens.length) {
			status = 'Kies minimaal een allergeen voordat je scant.';
			speak(status);
			mode = 'setup';
			return;
		}

		try {
			mode = 'scanning';
			debugResumeMode = '';
			resetScanOutput();
			await tick();
			await startCameraSession('Camera klaar. Richt op de barcode.');
		} catch (error) {
			cameraLoading = false;
			status = 'Cameratoegang mislukt. Geef toestemming voor de camera en probeer opnieuw.';
			guidance = status;
			speak(status);
			console.error(error);
		}
	}

	async function startCameraSession(readyMessage) {
		stopScanning();
		cameraLoading = true;
		status = 'Camera wordt gestart.';
		stream = await navigator.mediaDevices.getUserMedia({
			video: {
				facingMode: cameraFacingMode,
				width: { ideal: 1920 },
				height: { ideal: 1080 },
				focusMode: 'continuous'
			},
			audio: false
		});
		video.srcObject = stream;
		await video.play();
		cameraReady = true;
		cameraLoading = false;
		scanning = true;
		status = readyMessage;
		guidance = readyMessage;
		speak(status);
		if (!ocrOnlyMode) {
			ensureBarcodeReaders();
			barcodeTimer = window.setInterval(analyzeBarcodeFrame, 250);
		} else {
			await ensureWorker();
			barcodeStatus = '';
			barcodeFrame = null;
			ocrTimer = window.setInterval(
				analyzeTextFrame,
				ingredientDebugMode ? Math.max(150, Number(debugCaptureInterval) || 750) : 1800
			);
		}
		analyzeFrame();
	}

	function stopScanning() {
		scanning = false;
		cameraReady = false;
		cameraLoading = false;
		if (barcodeTimer) window.clearInterval(barcodeTimer);
		if (ocrTimer) window.clearInterval(ocrTimer);
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			stream = undefined;
		}
	}

	async function ensureWorker() {
		if (workerReady || worker) return;
		status = 'Open-source OCR-engine wordt geladen.';
		worker = await createWorker(['eng', 'nld'], 1, {
			logger: (message) => {
				if (message.status === 'recognizing text') ocrProgress = Math.round(message.progress * 100);
			}
		});
		await worker.setParameters({
			preserve_interword_spaces: '1',
			tessedit_pageseg_mode: '6'
		});
		workerReady = true;
	}

	async function analyzeFrame() {
		if (!ocrOnlyMode) await analyzeBarcodeFrame();
		if (ocrOnlyMode) await analyzeTextFrame();
	}

	async function analyzeBarcodeFrame() {
		if (
			!video ||
			!canvas ||
			!cameraReady ||
			barcodeBusy ||
			video.videoWidth === 0 ||
			barcodeLocked ||
			ocrOnlyMode
		)
			return;

		const context = drawCameraFrame(ocrOnlyMode ? 1280 : 960);
		if (!context) return;

		barcodeBusy = true;
		try {
			const barcodeFound = await detectBarcodeInFrame(canvas);
			if (!barcodeFound) {
				barcodeStatus =
					'Barcode wordt gezocht. Houd de streepjescode groot, recht en scherp in beeld.';
			}
		} finally {
			barcodeBusy = false;
		}
	}

	async function analyzeTextFrame(forceCapture = false) {
		if (
			!video ||
			!canvas ||
			!cameraReady ||
			ocrBusy ||
			video.videoWidth === 0 ||
			(barcodeLocked && !ocrOnlyMode)
		)
			return;

		const context = drawCameraFrame(960);
		if (!context) return;
		const { width, height } = canvas;

		const metrics = inspectFrame(context, width, height);
		const instruction = guidanceFromMetrics(metrics);
		updateGuidance(instruction);

		if (ingredientDebugMode && !debugAutoCapture && !forceCapture) {
			return;
		}

		if (!metrics.canAttemptOcr && !ingredientDebugMode) {
			ocrTextStableCount = 0;
			return;
		}

		if (ocrOnlyMode && !ingredientDebugMode && ocrTextStableCount < 1) {
			ocrTextStableCount += 1;
			updateGuidance('Tekst gezien. Houd stil, ik maak nu een foto voor de scan.');
			return;
		}

		ocrBusy = true;
		ocrProgress = 0;
		status = ocrOnlyMode ? 'Foto wordt gemaakt en gelezen.' : 'Labeltekst wordt gelezen.';

		try {
			const capturedCanvases = ocrOnlyMode ? await captureIngredientPhotoSet() : [cloneCanvas(canvas)];
			if (ingredientDebugMode) debugCaptureCount += 1;
			const result =
				ocrOnlyMode && Capacitor.isNativePlatform()
					? await recognizeWithNativeOcr(capturedCanvases)
					: await recognizeWithTesseract(capturedCanvases);
			extractedText = normalizeWhitespace(result.text);
			ocrRawText = result.text || '';
			ocrEngine = result.engine || '';
			const confidence = Math.round(result.confidence || 0);
			ocrConfidence = confidence;

			const minimumTextLength = ingredientDebugMode ? 1 : ocrOnlyMode ? 12 : 20;
			const minimumConfidence = ingredientDebugMode ? 0 : ocrOnlyMode ? 28 : 35;

			if (extractedText.length < minimumTextLength || confidence < minimumConfidence) {
				ocrLastCandidate = '';
				ocrConsistentCount = 0;
				updateGuidance(
					ocrOnlyMode
						? 'Tekst is nog niet scherp genoeg. Houd stil, vul het midden met de ingrediëntenlijst en kantel tegen glans.'
						: 'Tekst is zichtbaar maar nog niet leesbaar. Houd stil en richt het label recht op de camera.'
				);
				return;
			}

			if (!ocrOnlyMode) {
				// Require 2 consistent OCR reads to prevent false triggers from background text.
				if (textsAreSimilar(extractedText, ocrLastCandidate)) {
					ocrConsistentCount++;
				} else {
					ocrLastCandidate = extractedText;
					ocrConsistentCount = 1;
					updateGuidance('Tekst gevonden. Houd de telefoon nog even stil.');
					return;
				}

				if (ocrConsistentCount < 2) {
					return;
				}
			}

			ocrLastCandidate = '';
			ocrConsistentCount = 0;

			if (!productName || ingredientDebugMode) productName = 'Ingredientenscan';
			productIngredients = extractedText;
			productStatus = extractedText
				? `Ingredienten gelezen met ${ocrEngine || 'OCR'}.`
				: 'Geen ingrediententekst gelezen.';
			checkTextForAllergens(extractedText, 'de gelezen labeltekst', confidence);
			if (ingredientDebugMode) {
				debugResultVisible = true;
				debugResumeMode = 'ingredient';
				status = `Debugfoto ${debugCaptureCount}: ${extractedText ? 'tekst gelezen' : 'geen tekst'}.`;
				guidance = status;
				return;
			}
			debugResultVisible = ingredientDebugMode;
			ocrOnlyMode = false;
			canScanIngredients = false;
			ingredientDebugMode = false;
			stopScanning();
			mode = 'result';
		} catch (error) {
			status = 'OCR is mislukt op dit beeld. Houd het label stil en probeer opnieuw.';
			guidance = status;
			console.error(error);
		} finally {
			ocrBusy = false;
		}
	}

	function drawCameraFrame(targetWidth) {
		if (!video || !canvas || video.videoWidth === 0) return null;

		const context = canvas.getContext('2d', { willReadFrequently: true });
		const width = Math.min(targetWidth, video.videoWidth || targetWidth);
		const height = Math.round((video.videoHeight / video.videoWidth) * width);
		canvas.width = width;
		canvas.height = height;
		context.drawImage(video, 0, 0, width, height);

		return context;
	}

	async function captureIngredientPhotoSet() {
		const frames = [];
		const frameCount = ingredientDebugMode ? 1 : 3;
		for (let index = 0; index < frameCount; index += 1) {
			const context = drawCameraFrame(1280);
			if (context) frames.push(cloneCanvas(canvas));
			if (index < frameCount - 1) await sleep(180);
		}

		if (frames[0]) {
			ocrSnapshot = frames[0].toDataURL('image/jpeg', 0.86);
		}

		return frames.length ? frames : [cloneCanvas(canvas)];
	}

	function cloneCanvas(sourceCanvas) {
		const copy = document.createElement('canvas');
		copy.width = sourceCanvas.width;
		copy.height = sourceCanvas.height;
		copy.getContext('2d').drawImage(sourceCanvas, 0, 0);
		return copy;
	}

	function sleep(ms) {
		return new Promise((resolve) => window.setTimeout(resolve, ms));
	}

	async function recognizeWithNativeOcr(sourceCanvases) {
		try {
			const images = prepareNativeOcrImages(sourceCanvases);
			const results = [];

			for (const image of images) {
				const nativeResult = await Ocr.process({ image });
				results.push(...(nativeResult.results || []));
			}

			const text = normalizeWhitespace(results.map((result) => result.text).join(' '));
			const confidence = normalizeNativeConfidence(results);
			if (!text) throw new Error('Native OCR vond geen tekst.');

			return { text, confidence, engine: 'mlkit' };
		} catch (error) {
			console.info('Native OCR niet beschikbaar of mislukt, val terug op Tesseract.', error);
			return recognizeWithTesseract(sourceCanvases);
		}
	}

	async function recognizeWithTesseract(sourceCanvases) {
		const ocrCanvas = prepareOcrCanvas(sourceCanvases, { stackSlices: ocrOnlyMode });
		const result = await worker.recognize(ocrCanvas);
		return {
			text: result.data.text,
			confidence: result.data.confidence || 0,
			engine: 'tesseract'
		};
	}

	function prepareNativeOcrImages(sourceCanvases) {
		const canvases = Array.isArray(sourceCanvases) ? sourceCanvases : [sourceCanvases];
		const images = [];

		for (const source of canvases.filter((item) => item?.width && item?.height).slice(0, 3)) {
			const region = cropCanvas(source, { x: 0.05, y: 0.12, width: 0.9, height: 0.76 });
			images.push(region.toDataURL('image/jpeg', 0.9));

			const strips = [
				{ x: 0, y: 0, width: 0.58, height: 1 },
				{ x: 0.21, y: 0, width: 0.58, height: 1 },
				{ x: 0.42, y: 0, width: 0.58, height: 1 }
			];
			for (const strip of strips) {
				images.push(cropCanvas(region, strip).toDataURL('image/jpeg', 0.9));
			}
		}

		return images;
	}

	function cropCanvas(sourceCanvas, region) {
		const output = document.createElement('canvas');
		const sourceX = Math.round(sourceCanvas.width * region.x);
		const sourceY = Math.round(sourceCanvas.height * region.y);
		const sourceWidth = Math.round(sourceCanvas.width * region.width);
		const sourceHeight = Math.round(sourceCanvas.height * region.height);
		output.width = Math.max(1, sourceWidth);
		output.height = Math.max(1, sourceHeight);
		output.getContext('2d').drawImage(
			sourceCanvas,
			sourceX,
			sourceY,
			sourceWidth,
			sourceHeight,
			0,
			0,
			output.width,
			output.height
		);
		return output;
	}

	function normalizeNativeConfidence(results) {
		const scores = results
			.map((result) => Number(result.confidence))
			.filter((value) => Number.isFinite(value) && value > 0)
			.map((value) => (value <= 1 ? value * 100 : value));

		if (!scores.length) return 80;
		return Math.max(...scores);
	}

	function prepareOcrCanvas(sourceCanvases, { stackSlices = false } = {}) {
		const canvases = Array.isArray(sourceCanvases) ? sourceCanvases : [sourceCanvases];
		const validCanvases = canvases.filter((item) => item?.width && item?.height);
		const sourceCanvas = validCanvases[0];
		if (!sourceCanvas) return canvas;

		const output = document.createElement('canvas');
		const sourceWidth = sourceCanvas.width;
		const sourceHeight = sourceCanvas.height;
		const targetWidth = stackSlices ? 1500 : 1300;
		const region = stackSlices
			? { x: 0.05, y: 0.12, width: 0.9, height: 0.76 }
			: { x: 0, y: 0, width: 1, height: 1 };
		const regionWidth = Math.round(sourceWidth * region.width);
		const regionHeight = Math.round(sourceHeight * region.height);
		const baseHeight = Math.round((regionHeight / regionWidth) * targetWidth);
		const gap = stackSlices ? 28 : 0;
		const slices = stackSlices
			? [
					{ x: 0.0, width: 1 },
					{ x: 0.0, width: 0.58 },
					{ x: 0.21, width: 0.58 },
					{ x: 0.42, width: 0.58 }
				]
			: [{ x: 0, width: 1 }];
		const rows = validCanvases.flatMap((source, photoIndex) =>
			slices.map((slice, sliceIndex) => ({ source, photoIndex, slice, sliceIndex }))
		);

		output.width = targetWidth;
		output.height = rows.length * baseHeight + Math.max(0, rows.length - 1) * gap;

		const context = output.getContext('2d', { willReadFrequently: true });
		context.fillStyle = '#ffffff';
		context.fillRect(0, 0, output.width, output.height);

		rows.forEach(({ source, slice }, index) => {
			const cropX = Math.round(source.width * region.x);
			const cropY = Math.round(source.height * region.y);
			const cropWidth = Math.round(source.width * region.width);
			const cropHeight = Math.round(source.height * region.height);
			const sourceX = cropX + Math.round(cropWidth * slice.x);
			const sourceSliceWidth = Math.min(
				source.width - sourceX,
				Math.round(cropWidth * slice.width)
			);
			const targetY = index * (baseHeight + gap);
			context.drawImage(
				source,
				sourceX,
				cropY,
				sourceSliceWidth,
				cropHeight,
				0,
				targetY,
				targetWidth,
				baseHeight
			);
			enhanceOcrRegion(context, 0, targetY, targetWidth, baseHeight);
		});

		return output;
	}

	function enhanceOcrRegion(context, x, y, width, height) {
		const image = context.getImageData(x, y, width, height);
		const data = image.data;
		let sum = 0;
		let sumSquares = 0;

		for (let i = 0; i < data.length; i += 4) {
			const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
			sum += gray;
			sumSquares += gray * gray;
		}

		const pixels = data.length / 4;
		const mean = sum / pixels;
		const variance = Math.max(0, sumSquares / pixels - mean * mean);
		const contrast = Math.sqrt(variance);
		const gain = Math.min(2.2, Math.max(1.25, 72 / Math.max(contrast, 1)));
		const threshold = mean < 130 ? 142 : 158;

		for (let i = 0; i < data.length; i += 4) {
			const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
			const boosted = Math.max(0, Math.min(255, (gray - mean) * gain + 128));
			const value = boosted < threshold ? 0 : 255;
			data[i] = value;
			data[i + 1] = value;
			data[i + 2] = value;
			data[i + 3] = 255;
		}

		context.putImageData(image, x, y);
	}

	function ensureBarcodeReaders() {
		if (!zxingReader) {
			const hints = new Map();
			hints.set(DecodeHintType.POSSIBLE_FORMATS, [
				BarcodeFormat.EAN_13,
				BarcodeFormat.EAN_8,
				BarcodeFormat.UPC_A,
				BarcodeFormat.UPC_E,
				BarcodeFormat.CODE_128,
				BarcodeFormat.CODE_39,
				BarcodeFormat.ITF
			]);
			hints.set(DecodeHintType.TRY_HARDER, true);
			zxingReader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
		}

		if (barcodeDetector || !barcodeSupported) return;

		if (!('BarcodeDetector' in window)) {
			barcodeSupported = Boolean(zxingReader);
			barcodeStatus =
				'ZXing barcodescanner actief. Richt de streepjescode groot en recht in beeld.';
			return;
		}

		try {
			barcodeDetector = new window.BarcodeDetector({
				formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf']
			});
			barcodeStatus = 'Automatische barcodescan actief. Richt de barcode groot en scherp in beeld.';
		} catch (error) {
			barcodeSupported = Boolean(zxingReader);
			barcodeStatus =
				'ZXing barcodescanner actief. Richt de streepjescode groot en recht in beeld.';
			console.info(error);
		}
	}

	async function detectBarcodeInFrame(sourceCanvas) {
		if (barcodeLocked) return false;

		try {
			const nativeResult = await detectWithNativeBarcodeDetector(sourceCanvas);
			if (nativeResult) return lockBarcode(nativeResult, sourceCanvas, 'camera');

			const zxingResult = detectWithZxing(sourceCanvas);
			if (zxingResult) return lockBarcode(zxingResult, sourceCanvas, 'camera');
		} catch (error) {
			barcodeStatus = 'Barcode nog niet leesbaar. Probeer dichterbij, rechter en met meer licht.';
			console.info(error);
		}

		return false;
	}

	async function detectWithNativeBarcodeDetector(sourceCanvas) {
		if (!barcodeDetector) return null;

		const barcodes = await barcodeDetector.detect(sourceCanvas);
		const detected = barcodes.find((item) => item.rawValue?.replace(/\D/g, '').length >= 8);
		if (!detected) return null;

		const barcode = detected.rawValue.replace(/\D/g, '');
		return {
			barcode,
			frame: detected.boundingBox
				? frameFromBounds(
						detected.boundingBox.x,
						detected.boundingBox.y,
						detected.boundingBox.width,
						detected.boundingBox.height
					)
				: null
		};
	}

	function detectWithZxing(sourceCanvas) {
		if (!zxingReader) return null;

		try {
			const result = zxingReader.decodeFromCanvas(sourceCanvas);
			const barcode = result.getText()?.replace(/\D/g, '');
			if (!barcode || barcode.length < 8) return null;

			return {
				barcode,
				frame: frameFromResultPoints(sourceCanvas, result.getResultPoints())
			};
		} catch {
			return null;
		}
	}

	async function lockBarcode(result, sourceCanvas, source) {
		barcodeFrame = result.frame;
		barcodeSnapshot = sourceCanvas.toDataURL('image/jpeg', 0.85);
		status = 'Barcode gevonden. Scanner gestopt en beeld vastgelegd.';
		guidance = status;
		if (barcodeDebugMode) {
			const now = Date.now();
			if (now - lastDebugBarcodeAt < 500) return true;
			lastDebugBarcodeAt = now;
			detectedBarcode = result.barcode;
			manualBarcode = result.barcode;
			barcodeStatus = `Debug barcode gevonden via ${source}: ${result.barcode}`;
			productName = 'Debug barcodescan';
			productMeta = '';
			productIngredients = '';
			productStatus = barcodeStatus;
			debugResultVisible = true;
			debugResumeMode = 'barcode';
			status = barcodeStatus;
			guidance = barcodeStatus;
			speak(barcodeStatus);
			return true;
		}
		barcodeLocked = true;
		stopScanning();
		await setBarcode(result.barcode, source);
		return true;
	}

	function frameFromResultPoints(sourceCanvas, points) {
		const validPoints = points
			?.map((point) => ({ x: point.getX(), y: point.getY() }))
			.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

		if (!validPoints?.length) return null;

		const xs = validPoints.map((point) => point.x);
		const ys = validPoints.map((point) => point.y);
		const centerY = ys.reduce((sum, y) => sum + y, 0) / ys.length;
		const minX = Math.max(0, Math.min(...xs) - sourceCanvas.width * 0.05);
		const maxX = Math.min(sourceCanvas.width, Math.max(...xs) + sourceCanvas.width * 0.05);
		const estimatedY = estimateBarcodeVerticalBounds(sourceCanvas, minX, maxX, centerY);
		const minY = estimatedY ? estimatedY.minY : Math.max(0, centerY - sourceCanvas.height * 0.14);
		const maxY = estimatedY
			? estimatedY.maxY
			: Math.min(sourceCanvas.height, centerY + sourceCanvas.height * 0.14);

		return frameFromBounds(minX, minY, maxX - minX, maxY - minY);
	}

	function estimateBarcodeVerticalBounds(sourceCanvas, minX, maxX, centerY) {
		const context = sourceCanvas.getContext('2d', { willReadFrequently: true });
		const left = Math.max(0, Math.floor(minX));
		const right = Math.min(sourceCanvas.width, Math.ceil(maxX));
		const top = Math.max(0, Math.floor(centerY - sourceCanvas.height * 0.25));
		const bottom = Math.min(sourceCanvas.height, Math.ceil(centerY + sourceCanvas.height * 0.25));
		const width = right - left;
		const height = bottom - top;
		if (width < 20 || height < 20) return null;

		const { data } = context.getImageData(left, top, width, height);
		const rowScores = [];

		for (let y = 0; y < height; y += 1) {
			let transitions = 0;
			let previous = null;

			for (let x = 0; x < width; x += 3) {
				const index = (y * width + x) * 4;
				const value = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
				if (previous !== null && Math.abs(value - previous) > 42) transitions += 1;
				previous = value;
			}

			rowScores.push(transitions);
		}

		const maxScore = Math.max(...rowScores);
		if (maxScore < 10) return null;

		const threshold = Math.max(8, maxScore * 0.42);
		const activeRows = rowScores
			.map((score, index) => (score >= threshold ? index : -1))
			.filter((index) => index >= 0);
		if (!activeRows.length) return null;

		const minActiveY = Math.max(0, Math.min(...activeRows) - 8);
		const maxActiveY = Math.min(height, Math.max(...activeRows) + 8);
		return {
			minY: top + minActiveY,
			maxY: top + maxActiveY
		};
	}

	function frameFromBounds(x, y, width, height) {
		if (!canvas?.width || !canvas?.height || width <= 0 || height <= 0) return null;

		return {
			left: `${(x / canvas.width) * 100}%`,
			top: `${(y / canvas.height) * 100}%`,
			width: `${(width / canvas.width) * 100}%`,
			height: `${(height / canvas.height) * 100}%`
		};
	}

	function inspectFrame(context, width, height) {
		const image = context.getImageData(0, 0, width, height);
		const data = image.data;
		let brightness = 0;
		let contrastSum = 0;
		let edgeCount = 0;
		let darkPixels = 0;
		let lightPixels = 0;
		let centerEdges = 0;
		let blurEnergy = 0;
		const gray = new Uint8ClampedArray(width * height);

		for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
			const value = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
			gray[p] = value;
			brightness += value;
			if (value < 70) darkPixels += 1;
			if (value > 185) lightPixels += 1;
		}

		const average = brightness / gray.length;
		for (let p = 0; p < gray.length; p += 1) contrastSum += Math.abs(gray[p] - average);

		for (let y = 1; y < height - 1; y += 2) {
			for (let x = 1; x < width - 1; x += 2) {
				const index = y * width + x;
				const gx = Math.abs(gray[index - 1] - gray[index + 1]);
				const gy = Math.abs(gray[index - width] - gray[index + width]);
				const laplacian = Math.abs(
					gray[index - width] +
						gray[index + width] +
						gray[index - 1] +
						gray[index + 1] -
						gray[index] * 4
				);
				if (gx + gy > 55) {
					edgeCount += 1;
					if (x > width * 0.2 && x < width * 0.8 && y > height * 0.2 && y < height * 0.8) {
						centerEdges += 1;
					}
				}
				blurEnergy += laplacian;
			}
		}

		const sampled = (width * height) / 4;
		const edgeRatio = edgeCount / sampled;
		const centerRatio = centerEdges / Math.max(edgeCount, 1);
		const contrast = contrastSum / gray.length;
		const blur = blurEnergy / sampled;
		const exposureRange = (darkPixels + lightPixels) / gray.length;

		return {
			average,
			contrast,
			edgeRatio,
			centerRatio,
			blur,
			exposureRange,
			canAttemptOcr:
				average > 45 &&
				average < 220 &&
				contrast > 28 &&
				edgeRatio > 0.025 &&
				centerRatio > 0.35 &&
				blur > 7
		};
	}

	function guidanceFromMetrics(metrics) {
		if (metrics.average < 45) return 'Het beeld is te donker. Ga naar beter licht.';
		if (metrics.average > 220)
			return 'Het label is overbelicht of reflecteert. Kantel het weg van de glans.';
		if (metrics.edgeRatio < 0.012)
			return 'Geen tekst gevonden. Probeer de ingredientenkant van de verpakking.';
		if (metrics.edgeRatio < 0.025)
			return 'De tekst is mogelijk te ver weg. Beweeg de camera dichterbij.';
		if (metrics.centerRatio < 0.35)
			return 'Tekst staat aan de rand van het beeld. Centreer het label.';
		if (metrics.blur < 7) return 'Het beeld is te wazig. Houd de camera even stil.';
		if (metrics.contrast < 28)
			return 'Het tekstcontrast is laag. Verbeter het licht of kantel de verpakking.';
		return 'Tekst gevonden. Houd stil terwijl ik lees.';
	}

	async function saveManualBarcode() {
		const cleaned = manualBarcode.replace(/\D/g, '');
		if (!cleaned) {
			barcodeStatus = 'Voer eerst een barcode in.';
			speak(barcodeStatus);
			return;
		}

		await setBarcode(cleaned, 'handmatig');
	}

	async function setBarcode(barcode, source) {
		if (barcode === detectedBarcode && productName) return;

		detectedBarcode = barcode;
		manualBarcode = barcode;
		debugResumeMode = '';
		barcodeStatus = `Barcode ${barcode} gevonden via ${source}. Deze blijft zichtbaar in de output.`;
		speak(barcodeStatus);
		await lookupProduct(barcode);
		mode = 'result';
	}

	async function lookupProduct(barcode) {
		productLookupBusy = true;
		productName = '';
		productMeta = '';
		productIngredients = '';
		productStatus = 'Productinformatie wordt opgehaald.';

		try {
			const data = await fetchProductInfo(barcode);

			if (!data.found) {
				productStatus = `Product niet gevonden. De barcode is mogelijk niet leesbaar in de productdatabase, of het is een buitenlands/niet-geregistreerd artikel.`;
				status =
					'Product onbekend. Er kan geen betrouwbare allergiecheck worden gedaan via deze barcode.';
				guidance = status;
				speak(status);
				return;
			}

			productName = data.name;
			productMeta = [data.brand, data.quantity].filter(Boolean).join(' - ');
			productIngredients = normalizeWhitespace(data.ingredientsText || '');
			extractedText = productIngredients || normalizeWhitespace(data.matchText || '');
			productStatus = productIngredients
				? `Product gevonden: ${productName}. Ingredienten zijn gecontroleerd.`
				: `Product gevonden: ${productName}, maar ingredienten ontbreken in de productdatabase. Allergiecheck is daardoor beperkt.`;

			if (data.matchText) {
				checkTextForAllergens(data.matchText, `productinformatie van ${productName}`);
			} else {
				speak(productStatus);
			}
		} catch (error) {
			productStatus =
				'Productinformatie kon niet worden opgehaald. De barcode blijft bewaard, maar de allergiecheck kan niet betrouwbaar worden uitgevoerd.';
			status =
				'Productinformatie niet beschikbaar. Mogelijk is het artikel buitenlands, onbekend of tijdelijk niet bereikbaar.';
			guidance = status;
			speak(status);
			console.info(error);
		} finally {
			productLookupBusy = false;
			canScanIngredients = !productIngredients;
		}
	}

	async function startIngredientsScan() {
		if (!selectedAllergens.length) {
			status = 'Kies minimaal een allergeen voordat je scant.';
			speak(status);
			return;
		}
		ocrOnlyMode = true;
		ocrConfidence = 0;
		barcodeFrame = null;
		barcodeLocked = false;
		barcodeStatus = '';
		ocrLastCandidate = '';
		ocrConsistentCount = 0;
		ocrTextStableCount = 0;
		ocrSnapshot = '';
		ocrEngine = '';
		ocrRawText = '';
		debugResultVisible = false;
		barcodeDebugMode = false;
		debugResumeMode = '';
		debugCaptureCount = 0;
		lastDebugBarcodeAt = 0;
		lastVisibleGuidanceAt = 0;
		lastGuidanceAt = 0;
		try {
			mode = 'scanning';
			await tick();
			await startCameraSession('Camera klaar. Richt op de ingrediëntenlijst van de verpakking.');
		} catch (error) {
			ocrOnlyMode = false;
			cameraLoading = false;
			status = 'Cameratoegang mislukt. Geef toestemming voor de camera en probeer opnieuw.';
			guidance = status;
			speak(status);
			console.error(error);
		}
	}

	async function fetchProductInfo(barcode) {
		try {
			const response = await fetch(`/api/products/${barcode}`);
			if (!response.ok) throw new Error('Lokale API heeft geen product gevonden.');
			const data = await response.json();
			if (data.found) return data;
		} catch (error) {
			console.info('Lokale product API niet beschikbaar, probeer Open Food Facts direct.', error);
		}

		return fetchOpenFoodFactsProduct(barcode);
	}

	async function fetchOpenFoodFactsProduct(barcode) {
		const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
			headers: {
				'User-Agent': 'NahNutPrototype/1.0'
			}
		});

		if (!response.ok) {
			throw new Error(`Open Food Facts status ${response.status}`);
		}

		const data = await response.json();
		if (data.status !== 1 || !data.product) {
			return { barcode, found: false };
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

		return {
			barcode,
			found: true,
			name: productNameText || `Product ${barcode}`,
			brand: product.brands || '',
			quantity: product.quantity || '',
			ingredientsText,
			allergenText,
			matchText,
			source: 'Open Food Facts'
		};
	}

	function firstTextValue(values) {
		return values
			.map((value) => String(value || '').trim())
			.find((value) => value && value.toLowerCase() !== 'unknown') || '';
	}

	function checkTextForAllergens(text, sourceLabel, confidence = 100) {
		const matches = findAllergenMatches(text, selectedAllergens, allergens);
		matchedAllergens = matches;

		if (matches.length) {
			const names = matches.map((match) => match.name).join(', ');
			const hasDanger = matches.some((match) => match.severity !== 'caution');
			status = hasDanger
				? `Waarschuwing. Mogelijk allergeen gevonden in ${sourceLabel}: ${names}.`
				: `Let op. Mogelijke aanwijzing gevonden in ${sourceLabel}: ${names}. Controleer het etiket extra goed.`;
		} else {
			status = `Geen geselecteerde allergenen gevonden in ${sourceLabel}.`;
		}

		if (confidence > 0 && confidence < 65) {
			status += ` Let op: lage scanbetrouwbaarheid (${confidence}%). Controleer het etiket ook visueel.`;
		}

		guidance = status;
		speak(status);
	}

	function resetScanOutput() {
		detectedBarcode = '';
		barcodeLocked = false;
		ocrConfidence = 0;
		ocrOnlyMode = false;
		canScanIngredients = false;
		ocrLastCandidate = '';
		ocrConsistentCount = 0;
		ocrTextStableCount = 0;
		ocrSnapshot = '';
		ingredientDebugMode = false;
		barcodeDebugMode = false;
		debugResultVisible = false;
		ocrEngine = '';
		ocrRawText = '';
		debugCaptureCount = 0;
		lastDebugBarcodeAt = 0;
		lastVisibleGuidanceAt = 0;
		lastGuidanceAt = 0;
		barcodeSnapshot = '';
		barcodeFrame = null;
		productName = '';
		productMeta = '';
		productIngredients = '';
		productStatus = 'Nog geen product gevonden.';
		barcodeStatus = barcodeSupported
			? 'Automatische barcodescan actief. Richt de barcode groot en scherp in beeld.'
			: 'Automatische barcodescan wordt niet ondersteund in deze browser. Handmatig invoeren kan wel.';
		extractedText = '';
		matchedAllergens = [];
	}

	function textsAreSimilar(a, b) {
		if (!a || !b) return false;
		const wordsA = new Set(
			a
				.toLowerCase()
				.split(/\s+/)
				.filter((w) => w.length > 3)
		);
		const wordsB = b
			.toLowerCase()
			.split(/\s+/)
			.filter((w) => w.length > 3);
		if (!wordsA.size || !wordsB.length) return false;
		const shared = wordsB.filter((w) => wordsA.has(w)).length;
		return shared / Math.max(wordsA.size, wordsB.length) >= 0.35;
	}

	function updateGuidance(message) {
		const now = Date.now();
		const visualDelay = ocrOnlyMode ? 5500 : 3500;
		const speechDelay = ocrOnlyMode ? 8500 : 5000;

		if (message !== guidance && now - lastVisibleGuidanceAt > visualDelay) {
			guidance = message;
			lastVisibleGuidanceAt = now;
		}

		if (message !== lastSpoken && now - lastGuidanceAt > speechDelay) {
			lastGuidanceAt = now;
			speak(message);
		}
	}

	async function startIngredientDebugScan() {
		if (!selectedAllergens.length) {
			selectedAllergens = allergens.map((allergen) => allergen.id);
			await saveProfile();
		}

		ingredientDebugMode = true;
		debugResultVisible = true;
		debugResumeMode = 'ingredient';
		debugCaptureCount = 0;
		productName = 'Debug ingredientenscan';
		productMeta = '';
		productIngredients = '';
		productStatus = 'Debugscan gestart.';
		menuOpen = false;
		menuView = 'main';
		await startIngredientsScan();
		ingredientDebugMode = true;
		debugResultVisible = true;
		debugResumeMode = 'ingredient';
	}

	async function startBarcodeDebugScan() {
		barcodeDebugMode = true;
		debugResultVisible = false;
		debugResumeMode = 'barcode';
		debugCaptureCount = 0;
		lastDebugBarcodeAt = 0;
		ingredientDebugMode = false;
		ocrOnlyMode = false;
		ocrEngine = '';
		ocrRawText = '';
		ocrSnapshot = '';
		productName = 'Debug barcodescan';
		productMeta = '';
		productIngredients = '';
		productStatus = 'Debug barcodecamera gestart.';
		menuOpen = false;
		menuView = 'main';

		try {
			mode = 'scanning';
			resetScanOutput();
			barcodeDebugMode = true;
			debugResumeMode = 'barcode';
			productName = 'Debug barcodescan';
			await tick();
			await startCameraSession('Debug barcodecamera klaar. Richt op de barcode.');
		} catch (error) {
			barcodeDebugMode = false;
			cameraLoading = false;
			status = 'Cameratoegang mislukt. Geef toestemming voor de camera en probeer opnieuw.';
			guidance = status;
			speak(status);
			console.error(error);
		}
	}

	async function scanAgain() {
		if (debugResumeMode === 'ingredient') {
			await startIngredientDebugScan();
			return;
		}

		if (debugResumeMode === 'barcode') {
			await startBarcodeDebugScan();
			return;
		}

		await startCamera();
	}

	async function forceIngredientPhoto() {
		if (!ocrOnlyMode || !cameraReady || ocrBusy) return;
		ingredientDebugMode = true;
		ocrTextStableCount = 999;
		await analyzeTextFrame(true);
	}

	function speak(message) {
		lastSpoken = message;
		if (!speechEnabled) return;
		if (Capacitor.isNativePlatform()) {
			// Use native Android TTS — reliable in Capacitor WebView.
			TextToSpeech.stop().catch(() => {});
			TextToSpeech.speak({ text: message, lang: 'nl-NL', rate: 0.95, volume: 1.0 }).catch((e) =>
				console.warn('TTS fout:', e)
			);
		} else {
			// Web Speech API fallback for browser.
			if (typeof speechSynthesis === 'undefined') return;
			if (speechSynthesis.speaking) speechSynthesis.cancel();
			const utterance = new SpeechSynthesisUtterance(message);
			const voices = speechSynthesis.getVoices();
			const nlVoice = voices.find((v) => v.lang && v.lang.startsWith('nl'));
			if (nlVoice) utterance.voice = nlVoice;
			utterance.lang = 'nl-NL';
			utterance.volume = 1;
			utterance.rate = 0.95;
			setTimeout(() => {
				if (speechSynthesis.paused) speechSynthesis.resume();
				speechSynthesis.speak(utterance);
			}, 50);
		}
	}

	function parseCreditsMarkdown(md) {
		const blocks = [];
		const mdLines = (md || '').split('\n');
		let current = null;
		let footer = [];
		let inFooter = false;
		for (const line of mdLines) {
			if (/^---+$/.test(line.trim())) {
				if (current) {
					blocks.push(current);
					current = null;
				}
				inFooter = true;
			} else if (!inFooter && line.startsWith('## ')) {
				if (current) blocks.push(current);
				current = { heading: line.slice(3).trim(), items: [] };
			} else if (line.trim()) {
				// Strip markdown list prefixes (- or *) and emphasis markers (* _ ~)
				const clean = line
					.trim()
					.replace(/^[-*+]\s+/, '')
					.replace(/[*_~]+/g, '');
				if (clean) {
					if (inFooter) footer.push(clean);
					else if (current) current.items.push(clean);
				}
			}
		}
		if (current) blocks.push(current);
		return { blocks, footer };
	}
</script>

<svelte:head>
	<title>NahNut</title>
	<meta
		name="description"
		content="NahNut: toegankelijk prototype voor allergendetectie met camera-OCR en gesproken begeleiding."
	/>
</svelte:head>

<div class={appClasses}>
	<a
		class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-yellow-300 focus:p-3 focus:text-black"
		href="#main-content"
	>
		Ga naar de app
	</a>

	{#if !menuOpen || menuView === 'main'}
		<button
			class="fixed left-3 top-3 z-[70] flex h-12 w-12 items-center justify-center border border-current bg-inherit text-2xl font-bold shadow"
			aria-expanded={menuOpen}
			aria-label="Menu openen"
			type="button"
			on:click={() => (menuOpen = !menuOpen)}
		>
			☰
		</button>
	{:else}
		<button
			class="fixed left-3 top-3 z-[70] flex h-12 w-12 items-center justify-center border border-current bg-inherit text-2xl font-bold shadow"
			aria-label="Terug"
			type="button"
			on:click={() =>
				menuView === 'credits'
					? (menuView = 'settings')
					: ((menuOpen = false), (menuView = 'main'))}
		>
			←
		</button>
	{/if}

	{#if !isOnline}
		<div
			class="fixed left-0 right-0 top-0 z-50 bg-red-700 px-16 py-3 font-bold text-white"
			role="alert"
		>
			Geen wifi beschikbaar. Productinformatie kan beperkt zijn.
		</div>
	{/if}

	{#if menuOpen}
		<button
			class="fixed inset-0 z-[60] bg-black/50"
			aria-label="Menu sluiten"
			type="button"
			on:click={() => (menuOpen = false)}
		></button>
		{#if menuView === 'main'}
			<aside
				class="fixed bottom-0 left-0 top-0 z-[65] flex w-80 max-w-[88vw] flex-col gap-4 border-r border-current/30 p-4 pt-20 shadow-xl"
				class:bg-black={highContrast}
				class:bg-white={!highContrast}
				aria-label="Menu"
			>
				<h2 class="text-2xl font-bold">Menu</h2>
				<section class="grid gap-2" aria-label="Toegankelijkheid">
					<button
						class="border border-current px-4 py-3 font-bold"
						class:bg-blue-500={highContrast}
						class:text-white={highContrast}
						aria-pressed={highContrast}
						type="button"
						on:click={toggleHighContrast}>Hoog contrast</button
					>
					<button
						class="border border-current px-4 py-3 font-bold"
						class:bg-blue-500={largeText}
						class:text-white={largeText}
						aria-pressed={largeText}
						type="button"
						on:click={toggleLargeText}>Grote tekst</button
					>
					<button
						class="border border-current px-4 py-3 font-bold"
						class:bg-blue-500={speechEnabled}
						class:text-white={speechEnabled}
						aria-pressed={speechEnabled}
						type="button"
						on:click={toggleSpeech}>Spraak</button
					>
				</section>
				<div class="mt-auto grid gap-3">
					<button
						class="border border-current px-4 py-3 text-left font-bold"
						type="button"
						on:click={() => (menuView = 'settings')}
					>
						Instellingen →
					</button>
					<button
						class="border border-current px-4 py-3 text-left font-bold opacity-60"
						type="button"
						disabled
					>
						Profielen<br /><span class="text-sm font-normal">Nog niet in gebruik</span>
					</button>
				</div>
			</aside>
		{:else if menuView === 'settings'}
			<aside
				class="fixed inset-0 z-[65] flex flex-col gap-6 overflow-y-auto p-4 pt-20 shadow-xl"
				class:bg-black={highContrast}
				class:bg-white={!highContrast}
				aria-label="Instellingen"
			>
				<h2 class="text-2xl font-bold">Instellingen</h2>
				<section class="grid gap-4 border border-current/30 p-4">
					<label class="grid gap-2 font-semibold" for="app-scale">
						<span>App grootte: {appScale}%</span>
						<input
							id="app-scale"
							bind:value={appScale}
							min="50"
							max="200"
							step="10"
							type="range"
							class="w-full"
							on:change={saveProfile}
						/>
					</label>
				</section>
				<button
					class="border border-current px-4 py-3 font-bold disabled:opacity-40"
					type="button"
					disabled={!speechEnabled}
					title={speechEnabled ? '' : 'Zet spraak aan om te testen'}
					on:click={() => speak('Dit is een spraaktest.')}>Test spraak</button
				>
				<section class="grid gap-3 border border-current/30 p-4">
					<h3 class="text-lg font-bold">Debug</h3>
					<p class="text-sm opacity-80">
						Open testcamera's en toon daarna alleen bij debugscans de ruwe uitvoer.
					</p>
					<label class="flex items-center gap-3 font-semibold">
						<input bind:checked={debugAutoCapture} type="checkbox" />
						<span>Ingredienten blijven fotograferen</span>
					</label>
					<label class="grid gap-2 font-semibold" for="debug-capture-interval">
						<span>Interval tussen foto's: {debugCaptureInterval} ms</span>
						<input
							id="debug-capture-interval"
							bind:value={debugCaptureInterval}
							min="150"
							max="3000"
							step="50"
							type="range"
						/>
					</label>
					<button
						class="bg-yellow-300 px-4 py-3 font-bold text-black"
						type="button"
						on:click={startIngredientDebugScan}
					>
						Debug ingredientenscanner
					</button>
					<button
						class="bg-blue-500 px-4 py-3 font-bold text-white"
						type="button"
						on:click={startBarcodeDebugScan}
					>
						Debug barcodescanner
					</button>
				</section>
				<div class="mt-auto">
					<button
						class="w-full border border-current px-4 py-3 text-left font-bold"
						type="button"
						on:click={() => (menuView = 'credits')}
					>
						Credits →
					</button>
				</div>
			</aside>
		{:else if menuView === 'credits'}
			<aside
				class="fixed inset-0 z-[65] flex flex-col gap-6 overflow-y-auto p-4 pt-20 shadow-xl"
				class:bg-black={highContrast}
				class:bg-white={!highContrast}
				aria-label="Credits"
			>
				<h2 class="text-2xl font-bold">Credits</h2>
				{#if creditBlocks.blocks.length}
					{#each creditBlocks.blocks as block}
						<section>
							<h3 class="mb-2 text-lg font-bold">{block.heading}</h3>
							<ul class="grid gap-1">
								{#each block.items as item}
									<li class="border-l-4 border-blue-500 pl-3">{item}</li>
								{/each}
							</ul>
						</section>
					{/each}
					{#if creditBlocks.footer.length}
						<div class="mt-auto pt-8 text-center text-sm opacity-60">
							{#each creditBlocks.footer as line}<p>{line}</p>{/each}
						</div>
					{/if}
				{:else}
					<p class="opacity-60">Geen credits gevonden.</p>
				{/if}
			</aside>
		{/if}
	{/if}

	<canvas bind:this={canvas} class="hidden" aria-hidden="true"></canvas>

	{#if mode === 'scanning'}
		<main id="main-content" class="fixed inset-0 bg-black text-white">
			<video
				bind:this={video}
				class="h-full w-full object-cover"
				aria-label="Cameravoorbeeld"
				muted
				playsinline
			></video>
			{#if cameraLoading || !cameraReady}
				<div
					class="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black text-white"
				>
					<img
						class="h-28 w-28 object-contain"
						src={highContrast ? '/nahnut-logo-dark.png' : '/nahnut-logo-light.png'}
						alt="NahNut logo"
					/>
					<p class="mt-4 text-lg font-bold">Camera wordt geladen...</p>
				</div>
			{/if}
			{#if ocrOnlyMode && ocrSnapshot}
				<div class="fixed right-3 top-24 z-40 w-28 border-2 border-yellow-300 bg-black p-1 text-xs font-bold text-white">
					<img class="aspect-[3/4] w-full object-cover" src={ocrSnapshot} alt="Foto voor OCR" />
					<p class="mt-1 text-center">Foto gemaakt</p>
				</div>
			{/if}
			<div class="fixed left-16 right-3 top-3 z-40 flex items-center justify-between gap-2">
				<button
					class="bg-black/75 px-4 py-3 font-bold text-white"
					type="button"
					on:click={returnToSelection}>Terug</button
				>
				<div class="flex gap-2">
					{#if ingredientDebugMode}
						<button
							class="bg-yellow-300 px-4 py-3 font-bold text-black disabled:opacity-50"
							type="button"
							disabled={ocrBusy}
							on:click={forceIngredientPhoto}
						>
							Maak foto
						</button>
					{/if}
					<button
						class="bg-black/75 px-4 py-3 font-bold text-white"
						type="button"
						on:click={switchCamera}
					>
						{cameraFacingMode === 'environment' ? 'Achterkant' : 'Voorkant'}
					</button>
				</div>
			</div>
			{#if ocrOnlyMode}
				<div class="pointer-events-none absolute inset-x-8 top-28 bottom-36 border-4 border-yellow-300/80">
					<div class="absolute -top-9 left-0 bg-yellow-300 px-2 py-1 text-sm font-bold text-black">
						Ingrediëntenlijst
					</div>
				</div>
			{:else}
				<div class="pointer-events-none absolute inset-x-10 top-32 bottom-40 border-4 border-blue-400">
					<div class="absolute -top-9 left-0 bg-blue-500 px-2 py-1 text-sm font-bold text-white">
						Barcode
					</div>
				</div>
			{/if}
			{#if barcodeFrame && !ocrOnlyMode}
				<div
					class="pointer-events-none absolute border-4 border-blue-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]"
					style:left={barcodeFrame.left}
					style:top={barcodeFrame.top}
					style:width={barcodeFrame.width}
					style:height={barcodeFrame.height}
					aria-hidden="true"
				>
					<div class="absolute -top-8 left-0 bg-blue-500 px-2 py-1 text-sm font-bold text-white">
						Barcode gezien
					</div>
				</div>
			{/if}
			<div class="fixed bottom-0 left-0 right-0 z-40 bg-black/85 p-4 text-white" aria-live="polite">
				<p class="font-bold">{guidance}</p>
				{#if ocrOnlyMode}
					<p class="mt-2 text-sm">
						Houd alleen de ingrediëntenlijst in het vak. Draai de verpakking langzaam als deze rond is.
						OCR {ocrProgress}%{ocrConfidence ? ` · betrouwbaarheid ${ocrConfidence}%` : ''}
					</p>
					{#if ingredientDebugMode}
						<div class="mt-3 max-h-36 overflow-auto border border-yellow-300/50 p-2 text-xs">
							<p class="font-bold">
								Debug: {debugCaptureCount} foto{debugCaptureCount === 1 ? '' : "'s"} · {ocrEngine || 'nog geen OCR'} · {ocrConfidence || 0}%
							</p>
							<p class="mt-1 whitespace-pre-wrap">{ocrRawText || 'Nog geen tekst gelezen.'}</p>
						</div>
					{/if}
				{:else}
					<p class="mt-2 text-sm">{barcodeStatus}</p>
					{#if barcodeDebugMode}
						<div class="mt-3 max-h-28 overflow-auto border border-blue-300/50 p-2 text-xs">
							<p class="font-bold">Debug barcode: {detectedBarcode || 'nog niets gezien'}</p>
							<p>{barcodeStatus}</p>
						</div>
					{/if}
				{/if}
			</div>
		</main>
	{:else if mode === 'result'}
		<main
			id="main-content"
			class="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-5 px-4 pb-28 pt-20"
		>
			<header class="flex items-center justify-between gap-3">
				<div>
					<p class="text-sm font-semibold uppercase tracking-wide text-blue-400">
						NahNut resultaat
					</p>
					<h1 class="text-3xl font-bold">{productName || 'Product onbekend'}</h1>
					{#if productMeta}<p>{productMeta}</p>{/if}
				</div>
				<button
					class="border border-current px-3 py-2 font-bold"
					type="button"
					on:click={returnToSelection}>Allergieën selectie</button
				>
			</header>
			<details class="border-l-4 border-yellow-300 bg-yellow-300/15 p-4">
				<summary class="cursor-pointer font-bold">Veiligheidsmelding prototype</summary>
				<p class="mt-3">
					Fout-positieve en fout-negatieve resultaten zijn mogelijk. Gebruik dit prototype niet als
					enige veiligheidscontrole voor echte medische beslissingen.
				</p>
			</details>
			<section class="border border-current/30 p-4" aria-labelledby="result-heading-new">
				<h2 id="result-heading-new" class="text-2xl font-bold">Allergieresultaat</h2>
				{#if ocrConfidence > 0 && ocrConfidence < 65}
					<p
						class="mt-3 border border-orange-500 bg-orange-500/10 px-3 py-2 text-sm font-semibold"
						role="alert"
					>
						Lage scanbetrouwbaarheid ({ocrConfidence}%) — controleer het etiket handmatig.
					</p>
				{/if}
				{#if matchedAllergens.length}
					<ul class="mt-3 grid gap-2">
						{#each matchedAllergens as match}
							<li
								class="border-2 p-3 font-semibold"
								class:border-red-900={match.severity !== 'caution'}
								class:bg-red-700={match.severity !== 'caution'}
								class:text-white={match.severity !== 'caution'}
								class:border-orange-700={match.severity === 'caution'}
								class:bg-orange-300={match.severity === 'caution'}
								class:text-black={match.severity === 'caution'}
							>
								<strong>{match.name}</strong><br />
								<span
									>{match.severity === 'caution' ? 'Mogelijke aanwijzing' : 'Allergeen gevonden'}: {match.matchedTerms.join(
										', '
									)}</span
								>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mt-3 border-2 border-green-700 bg-green-100 p-3 font-bold text-green-900">
						Geen geselecteerde allergenen gevonden.
					</p>
				{/if}
			</section>
			{#if canScanIngredients}
				<div class="border border-blue-500/50 p-4">
					<p class="mb-3 text-sm font-semibold">
						Product niet gevonden of ingrediënten ontbreken. Scan de ingrediëntenlijst direct:
					</p>
					<button
						class="w-full border-2 border-blue-500 px-4 py-3 font-bold text-blue-500"
						type="button"
						on:click={startIngredientsScan}>Scan ingrediëntenlijst</button
					>
				</div>
			{/if}
			<details class="border border-current/30">
				<summary class="cursor-pointer p-4 text-xl font-bold">Scanoverzicht</summary>
				<div class="px-4 pb-4">
					<p class="mt-2"><strong>Barcode:</strong> {detectedBarcode || 'Geen barcode'}</p>
					<p class="mt-2" aria-live="polite">
						{productLookupBusy ? 'Product wordt opgezocht...' : productStatus}
					</p>
				</div>
			</details>
			{#if debugResultVisible}
				<details class="border border-current/30" open>
					<summary class="cursor-pointer p-4 text-xl font-bold">Debug uitvoer</summary>
					<div class="grid gap-3 px-4 pb-4">
						<p><strong>Barcode:</strong> {detectedBarcode || 'Geen barcode'}</p>
						<p><strong>Barcode status:</strong> {barcodeStatus}</p>
						<p><strong>OCR-engine:</strong> {ocrEngine || 'Geen OCR-run'}</p>
						<p><strong>OCR-betrouwbaarheid:</strong> {ocrConfidence || 0}%</p>
						{#if barcodeSnapshot}
							<img
								class="max-h-64 w-full object-contain"
								src={barcodeSnapshot}
								alt="Laatst vastgelegde barcodefoto"
							/>
						{/if}
						{#if ocrSnapshot}
							<img
								class="max-h-64 w-full object-contain"
								src={ocrSnapshot}
								alt="Laatst vastgelegde OCR-foto"
							/>
						{/if}
						<pre class="max-h-72 overflow-auto whitespace-pre-wrap border border-current/20 p-3 text-sm">{ocrRawText || extractedText || 'Geen OCR-tekst beschikbaar.'}</pre>
					</div>
				</details>
			{/if}
			<div
				class="fixed bottom-0 left-0 right-0 z-40 border-t border-current/20 p-3"
				class:bg-black={highContrast}
				class:bg-slate-50={!highContrast}
			>
				<button
					class="w-full bg-blue-500 px-4 py-4 font-bold text-white"
					type="button"
					on:click={scanAgain}>Scan opnieuw</button
				>
			</div>
		</main>
	{:else}
		<main
			id="main-content"
			class="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 px-4 pb-28 pt-20"
		>
			<details class="border-l-4 border-yellow-300 bg-yellow-300/15 p-4">
				<summary class="cursor-pointer font-bold">Veiligheidsmelding prototype</summary>
				<p class="mt-3">
					Fout-positieve en fout-negatieve resultaten zijn mogelijk. Gebruik dit prototype niet als
					enige veiligheidscontrole voor echte medische beslissingen.
				</p>
			</details>
			<header class="text-center">
				<img
					class="mx-auto mb-3 h-24 w-24 object-contain"
					src={highContrast ? '/nahnut-logo-dark.png' : '/nahnut-logo-light.png'}
					alt="NahNut logo"
				/>
				<h1 class="text-4xl font-bold">NahNut</h1>
			</header>
			<section aria-labelledby="profile-heading-new">
				<h2 id="profile-heading-new" class="mb-2 text-2xl font-bold">Allergieën selectie</h2>
				<div class="mb-4 flex gap-2">
					<button
						class="bg-blue-500 px-4 py-3 font-bold text-white"
						type="button"
						on:click={selectAllAllergens}>Selecteer alles</button
					>
					<button
						class="border border-current px-4 py-3 font-bold"
						type="button"
						on:click={deselectAllAllergens}>Deselecteer alles</button
					>
				</div>
				<div class="mb-4">
					<input
						type="search"
						bind:value={allergenSearch}
						placeholder="Zoek allergeen..."
						class="w-full border border-current/40 bg-transparent px-4 py-3"
						aria-label="Zoek allergeen"
					/>
				</div>
				<div class="grid gap-4">
					{#each filteredCategorizedAllergens as category}
						<section
							class="border border-current/20 p-3"
							aria-labelledby={`category-new-${category.id}`}
						>
							<h3 id={`category-new-${category.id}`} class="mb-3 text-lg font-bold">
								{category.name}
							</h3>
							<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
								{#each category.allergens as allergen}
									<button
										class="min-h-14 border border-current/30 p-3 text-left font-semibold"
										class:bg-blue-500={selectedAllergens.includes(allergen.id)}
										class:text-white={selectedAllergens.includes(allergen.id)}
										aria-pressed={selectedAllergens.includes(allergen.id)}
										type="button"
										on:click={() => toggleAllergen(allergen.id)}
									>
										{allergen.name}
									</button>
								{/each}
							</div>
						</section>
					{/each}
				</div>
			</section>
			<div
				class="fixed bottom-0 left-0 right-0 z-40 border-t border-current/20 p-3"
				class:bg-black={highContrast}
				class:bg-slate-50={!highContrast}
			>
				<button
					class="w-full bg-blue-500 px-4 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
					disabled={!selectedAllergens.length}
					type="button"
					on:click={beginScanning}
				>
					Start scannen ({selectedAllergens.length} allergieën)
				</button>
			</div>
		</main>
	{/if}

	{#if false}
		<main
			id="main-content"
			class="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6"
		>
			<header class="flex flex-col gap-3 border-b border-current/20 pb-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p class="text-sm font-semibold uppercase tracking-wide text-blue-400">
							Hackathon prototype
						</p>
						<h1 class="text-3xl font-bold sm:text-5xl">NahNut</h1>
					</div>
					<div class="flex flex-wrap gap-2" aria-label="Toegankelijkheidsinstellingen">
						<button
							class="border border-current px-4 py-3 font-bold"
							class:bg-blue-500={highContrast}
							class:text-white={highContrast}
							class:bg-transparent={!highContrast}
							aria-pressed={highContrast}
							type="button"
							on:click={() => (highContrast = !highContrast)}
						>
							Hoog contrast
						</button>
						<button
							class="border border-current px-4 py-3 font-bold"
							class:bg-blue-500={largeText}
							class:text-white={largeText}
							class:bg-transparent={!largeText}
							aria-pressed={largeText}
							type="button"
							on:click={() => (largeText = !largeText)}
						>
							Grote tekst
						</button>
						<button
							class="border border-current px-4 py-3 font-bold"
							class:bg-blue-500={speechEnabled}
							class:text-white={speechEnabled}
							class:bg-transparent={!speechEnabled}
							aria-pressed={speechEnabled}
							type="button"
							on:click={() => (speechEnabled = !speechEnabled)}
						>
							Spraak
						</button>
					</div>
				</div>
				<details class="max-w-3xl">
					<summary class="cursor-pointer font-semibold">Hoe werkt het?</summary>
					<p class="mt-2">
						Stel in welke allergenen je moet vermijden, richt je telefoon op een etiket en dit
						prototype gebruikt Tesseract OCR met gesproken camerabegeleiding. Het hangt niet af van
						barcodedatabases of betaalde AI-vision-API's.
					</p>
				</details>
			</header>

			<details class="border-l-4 border-yellow-300 bg-yellow-300/15 p-4">
				<summary id="prototype-warning" class="cursor-pointer font-bold">
					Veiligheidsmelding prototype
				</summary>
				<p class="mt-3">
					Fout-positieve en fout-negatieve resultaten zijn mogelijk. OCR kan falen bij gebogen
					verpakkingen, glanzende reflecties, tekst met laag contrast, kleine letters, gevouwen
					labels, bewegingsonscherpte, onbekende talen of onvolledige ingredientenlijsten. Gebruik
					dit niet als enige veiligheidscontrole voor echte medische beslissingen.
				</p>
			</details>

			<nav class="grid grid-cols-2 gap-2" aria-label="App-onderdelen">
				<button
					class="border border-current px-4 py-3 font-bold {mode === 'setup'
						? 'bg-blue-500 text-white'
						: 'bg-transparent'}"
					type="button"
					on:click={() => (mode = 'setup')}
				>
					Profiel
				</button>
				<button
					class="border border-current px-4 py-3 font-bold {mode === 'scan'
						? 'bg-blue-500 text-white'
						: 'bg-transparent'} disabled:cursor-not-allowed disabled:opacity-40"
					disabled={!selectedAllergens.length}
					type="button"
					on:click={() => (mode = 'scan')}
				>
					Scanner
				</button>
			</nav>

			{#if mode === 'scan' && matchedAllergens.length}
				<div class="lg:hidden" aria-live="assertive">
					<section class="border-2 border-blue-500 p-4" aria-labelledby="mobile-result-heading">
						<h3 id="mobile-result-heading" class="mb-3 text-xl font-bold">Allergieresultaat</h3>
						<ul class="space-y-2">
							{#each matchedAllergens as match}
								<li
									class="border-2 p-3 font-semibold"
									class:border-red-900={match.severity !== 'caution'}
									class:bg-red-700={match.severity !== 'caution'}
									class:text-white={match.severity !== 'caution'}
									class:border-orange-700={match.severity === 'caution'}
									class:bg-orange-300={match.severity === 'caution'}
									class:text-black={match.severity === 'caution'}
								>
									<strong>{match.name}</strong><br />
									<span>
										{match.severity === 'caution' ? 'Mogelijke aanwijzing' : 'Allergeen gevonden'}:
										{match.matchedTerms.join(', ')}
									</span>
								</li>
							{/each}
						</ul>
					</section>
				</div>
			{/if}

			{#if mode === 'setup'}
				<section
					class="grid gap-5 lg:grid-cols-[1fr_20rem] pb-24 lg:pb-0"
					aria-labelledby="profile-heading"
				>
					<div>
						<h2 id="profile-heading" class="mb-2 text-2xl font-bold">Allergieprofiel</h2>
						<p class="mb-4">
							Kies een of meer allergenen. Het prototype zoekt op veelvoorkomende Nederlandse en
							Engelse termen, bijvoorbeeld melk, milk, lactose, whey en casein.
						</p>
						<div class="mb-4 flex flex-wrap gap-2">
							<button
								class="bg-blue-500 px-4 py-3 font-bold text-white"
								type="button"
								on:click={selectAllAllergens}
							>
								Selecteer alles
							</button>
							<button
								class="border border-current px-4 py-3 font-bold"
								type="button"
								on:click={deselectAllAllergens}
							>
								Deselecteer alles
							</button>
						</div>
						<div class="grid gap-4">
							{#each categorizedAllergens as category}
								<section
									class="border border-current/20 p-3"
									aria-labelledby={`category-${category.id}`}
								>
									<h3 id={`category-${category.id}`} class="mb-3 text-lg font-bold">
										{category.name}
									</h3>
									<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
										{#each category.allergens as allergen}
											<label
												class="flex min-h-14 items-center gap-3 border border-current/30 p-3"
												class:bg-blue-500={selectedAllergens.includes(allergen.id)}
												class:text-white={selectedAllergens.includes(allergen.id)}
											>
												<input
													checked={selectedAllergens.includes(allergen.id)}
													type="checkbox"
													on:change={() => toggleAllergen(allergen.id)}
												/>
												<span class="font-semibold">{allergen.name}</span>
											</label>
										{/each}
									</div>
								</section>
							{/each}
						</div>
					</div>
					<aside class="border border-current/30 p-4">
						<h3 class="text-xl font-bold">Geselecteerd</h3>
						<p class="mt-2 min-h-20">
							{selectedNames || 'Nog geen allergenen geselecteerd.'}
						</p>
						<button
							class="mt-4 w-full bg-blue-500 px-4 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
							disabled={!selectedAllergens.length}
							type="button"
							on:click={saveProfile}
						>
							Profiel opslaan
						</button>
					</aside>
				</section>
				<div
					class="fixed bottom-0 left-0 right-0 z-40 border-t border-current/20 p-3 lg:hidden"
					class:bg-black={highContrast}
					class:bg-slate-50={!highContrast}
				>
					<button
						class="w-full bg-blue-500 px-4 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
						disabled={!selectedAllergens.length}
						type="button"
						on:click={saveProfile}
					>
						Profiel opslaan{selectedAllergens.length
							? ' (' + selectedAllergens.length + ' geselecteerd)'
							: ''}
					</button>
				</div>
			{:else}
				<section
					class="grid gap-5 lg:grid-cols-[1fr_24rem]"
					class:pb-24={barcodeLocked}
					aria-labelledby="scanner-heading"
				>
					<div class="flex flex-col gap-4">
						{#if !barcodeLocked}
							<div class="flex flex-wrap items-center justify-between gap-3">
								<div>
									<h2 id="scanner-heading" class="text-2xl font-bold">Barcode scanner</h2>
									<details class="mt-2 border border-current/25 px-3 py-2">
										<summary class="cursor-pointer font-semibold">
											Gekozen profiel ({selectedAllergens.length})
										</summary>
										<p class="mt-2">{selectedNames || 'Nog geen allergenen geselecteerd.'}</p>
									</details>
								</div>
								<div class="flex flex-wrap items-end gap-2">
									<label
										class="flex flex-col gap-1 font-semibold sm:hidden"
										for="camera-facing-mode"
									>
										<span>Camera</span>
										<select
											id="camera-facing-mode"
											bind:value={cameraFacingMode}
											class="min-h-12 border border-current/40 bg-transparent px-3"
											disabled={scanning}
										>
											<option class="text-black" value="environment">Achtercamera</option>
											<option class="text-black" value="user">Voorcamera</option>
										</select>
									</label>
									<button
										class="bg-blue-500 px-4 py-3 font-bold text-white disabled:opacity-50"
										disabled={scanning}
										type="button"
										on:click={startCamera}
									>
										Start camera
									</button>
									<button
										class="border border-current px-4 py-3 font-bold disabled:opacity-50"
										disabled={!scanning}
										type="button"
										on:click={stopScanning}
									>
										Stop
									</button>
								</div>
							</div>

							<div class="relative overflow-hidden border border-current/40 bg-slate-900">
								{#if barcodeSnapshot}
									<img
										alt="Vastgelegd camerabeeld van de gevonden barcode"
										class="aspect-[4/3] w-full object-cover"
										src={barcodeSnapshot}
									/>
								{:else}
									<video
										bind:this={video}
										class="aspect-[4/3] w-full object-cover"
										aria-label="Cameravoorbeeld"
										muted
										playsinline
									></video>
									<div class="pointer-events-none absolute inset-8 border-4 border-blue-400"></div>
								{/if}
								{#if barcodeFrame}
									<div
										class="pointer-events-none absolute border-4 border-blue-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]"
										style:left={barcodeFrame.left}
										style:top={barcodeFrame.top}
										style:width={barcodeFrame.width}
										style:height={barcodeFrame.height}
										aria-hidden="true"
									>
										<div
											class="absolute -top-8 left-0 bg-blue-400 px-2 py-1 text-sm font-bold text-white"
										>
											Barcode gezien
										</div>
									</div>
								{/if}
								<div
									class="absolute bottom-0 left-0 right-0 bg-black/80 p-3 text-white"
									aria-live="polite"
								>
									{guidance}
								</div>
							</div>
						{/if}

						{#if barcodeLocked}
							<div
								class="fixed bottom-0 left-0 right-0 z-40 border-t border-current/20 p-3"
								class:bg-black={highContrast}
								class:bg-slate-50={!highContrast}
							>
								<button
									class="w-full bg-blue-500 px-4 py-4 font-bold text-white"
									type="button"
									on:click={startCamera}
								>
									Scan opnieuw
								</button>
							</div>
						{/if}

						<canvas bind:this={canvas} class="hidden" aria-hidden="true"></canvas>

						{#if !barcodeLocked}
							<section class="border border-current/30 p-4" aria-labelledby="barcode-heading">
								<h3 id="barcode-heading" class="text-xl font-bold">Barcode zoeken</h3>
								<p class="mt-2">
									Scan de barcode met de camera of voer de code handmatig in. Als het product niet
									bekend is, toont de app een duidelijke melding.
								</p>
								<div class="mt-3 flex flex-col gap-2 sm:flex-row">
									<label class="sr-only" for="manual-barcode">Barcode</label>
									<input
										id="manual-barcode"
										bind:value={manualBarcode}
										class="min-h-12 flex-1 border border-current/40 bg-transparent px-3"
										inputmode="numeric"
										pattern="[0-9]*"
										placeholder="Bijvoorbeeld 8712345678901"
										type="text"
									/>
									<button
										class="bg-blue-500 px-4 py-3 font-bold text-white"
										type="button"
										on:click={saveManualBarcode}
									>
										Zoeken
									</button>
								</div>
								<p class="mt-2" aria-live="polite">{barcodeStatus}</p>
							</section>
						{/if}
					</div>

					<aside class="flex flex-col gap-4">
						<section
							class="hidden border border-current/30 p-4 lg:block"
							aria-labelledby="result-heading"
						>
							<h3 id="result-heading" class="text-xl font-bold">Allergieresultaat</h3>
							{#if matchedAllergens.length}
								<ul class="mt-3 space-y-2">
									{#each matchedAllergens as match}
										<li
											class="border-2 p-3 font-semibold"
											class:border-red-900={match.severity !== 'caution'}
											class:bg-red-700={match.severity !== 'caution'}
											class:text-white={match.severity !== 'caution'}
											class:border-orange-700={match.severity === 'caution'}
											class:bg-orange-300={match.severity === 'caution'}
											class:text-black={match.severity === 'caution'}
										>
											<strong>{match.name}</strong>
											<br />
											<span>
												{match.severity === 'caution'
													? 'Mogelijke aanwijzing'
													: 'Allergeen gevonden'}:
												{match.matchedTerms.join(', ')}
											</span>
										</li>
									{/each}
								</ul>
							{:else}
								<p class="mt-2">Nog geen gekozen allergenen gevonden.</p>
							{/if}
						</section>

						<section class="border border-current/30 p-4" aria-labelledby="product-heading">
							<h3 id="product-heading" class="text-xl font-bold">Scanoverzicht</h3>
							<ol class="mt-3 grid gap-3">
								<li class="border-l-4 border-blue-500 pl-3">
									<strong>1. Barcode</strong>
									<p>{detectedBarcode || 'Nog geen barcode gevonden.'}</p>
								</li>
								<li class="border-l-4 border-blue-500 pl-3">
									<strong>2. Product</strong>
									<p>{productName || 'Nog geen product bekend.'}</p>
								</li>
								{#if productMeta}
									<li class="border-l-4 border-blue-500 pl-3">
										<strong>Details</strong>
										<p>{productMeta}</p>
									</li>
								{/if}
								{#if productIngredients}
									<li class="border-l-4 border-blue-500 pl-3">
										<strong>3. Ingredienten</strong>
										<p>Ingredienten uit Open Food Facts gebruikt voor de allergiecheck.</p>
									</li>
								{/if}
							</ol>
						</section>

						<details class="border border-current/30 p-4">
							<summary id="live-status" class="cursor-pointer text-xl font-bold"
								>Technische status</summary
							>
							<p class="mt-3" aria-live="assertive">{status}</p>
							<p class="mt-2">OCR-engine: {workerReady ? 'klaar' : 'niet geladen'}</p>
							<p>OCR-voortgang: {ocrProgress}%</p>
							<p>{backendStatus}</p>
						</details>
					</aside>
				</section>
			{/if}
		</main>
	{/if}
</div>
