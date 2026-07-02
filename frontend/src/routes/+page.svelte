<script>
	import { onDestroy, onMount, tick } from 'svelte';
	import { BrowserMultiFormatReader } from '@zxing/browser';
	import { BarcodeFormat, DecodeHintType } from '@zxing/library';
	import { createWorker } from 'tesseract.js';
	import { findAllergenMatches, normalizeWhitespace } from '$lib/allergenMatch.js';

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
			terms: ['milk', 'melk', 'lactose', 'wei', 'whey', 'casein', 'kaas', 'cream', 'butter']
		},
		{ id: 'egg', name: 'Ei', terms: ['egg', 'ei', 'eggs', 'albumen', 'albumin', 'eigeel', 'eier'] },
		{ id: 'peanut', name: 'Pinda', terms: ['peanut', 'pinda', 'arachis', 'groundnut', 'satay'] },
		{
			id: 'tree-nut',
			name: 'Boomnoten',
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
			terms: ['soy', 'soya', 'soja', 'soybean', 'sojalecithine', 'lecithin']
		},
		{
			id: 'wheat',
			name: 'Tarwe',
			terms: ['wheat', 'tarwe', 'gluten', 'flour', 'bloem', 'semolina', 'spelt']
		},
		{
			id: 'gluten',
			name: 'Gluten',
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
		{ id: 'sesame', name: 'Sesam', terms: ['sesame', 'sesam', 'tahini'] },
		{ id: 'mustard', name: 'Mosterd', terms: ['mustard', 'mosterd'] },
		{ id: 'celery', name: 'Selderij', terms: ['celery', 'selderij', 'celeriac'] },
		{ id: 'lupin', name: 'Lupin', terms: ['lupin', 'lupine'] },
		{
			id: 'sulphites',
			name: 'Sulfiet',
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
		{ id: 'corn', name: 'Mais', terms: ['corn', 'maize', 'mais', 'cornstarch', 'maizena'] },
		{ id: 'oat', name: 'Haver', terms: ['oat', 'oats', 'haver'] },
		{ id: 'barley', name: 'Gerst', terms: ['barley', 'gerst', 'malt', 'mout'] },
		{ id: 'rye', name: 'Rogge', terms: ['rye', 'rogge'] },
		{ id: 'buckwheat', name: 'Boekweit', terms: ['buckwheat', 'boekweit'] },
		{ id: 'kiwi', name: 'Kiwi', terms: ['kiwi'] },
		{ id: 'banana', name: 'Banaan', terms: ['banana', 'banaan'] },
		{ id: 'strawberry', name: 'Aardbei', terms: ['strawberry', 'aardbei'] },
		{ id: 'tomato', name: 'Tomaat', terms: ['tomato', 'tomaat'] },
		{
			id: 'cocoa',
			name: 'Cacao',
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
		{
			id: 'citrus',
			name: 'Citrus',
			terms: ['citrus', 'orange', 'sinaasappel', 'lemon', 'citroen', 'lime', 'limoen']
		},
		{ id: 'mushroom', name: 'Paddenstoel', terms: ['mushroom', 'champignon', 'paddenstoel'] },
		{ id: 'yeast', name: 'Gist', terms: ['yeast', 'gist'] },
		{ id: 'gelatin', name: 'Gelatine', terms: ['gelatin', 'gelatine'] },
		{ id: 'aspartame', name: 'Aspartame', terms: ['aspartame', 'aspartaam', 'e951'] },
		{
			id: 'msg',
			name: 'MSG',
			terms: ['msg', 'monosodium glutamate', 'mononatriumglutamaat', 'e621']
		}
	];

	let allergens = defaultAllergens;
	let selectedAllergens = [];
	let mode = 'setup';
	let highContrast = true;
	let largeText = false;
	let speechEnabled = true;
	let cameraFacingMode = 'environment';
	let backendStatus = 'Offline allergenenlijst wordt gebruikt.';
	let manualBarcode = '';
	let barcodeStatus = 'Geen barcode ingevoerd.';
	let barcodeSupported = true;
	let barcodeBusy = false;
	let barcodeFrame = null;
	let detectedBarcode = '';
	let barcodeLocked = false;
	let barcodeSnapshot = '';
	let productName = '';
	let productMeta = '';
	let productIngredients = '';
	let productLookupBusy = false;
	let productStatus = 'Nog geen product gevonden.';
	let cameraReady = false;
	let scanning = false;
	let ocrBusy = false;
	let workerReady = false;
	let ocrProgress = 0;
	let status = 'Stel eerst je allergieprofiel in.';
	let guidance = 'De camera is nog niet actief.';
	let extractedText = '';
	let matchedAllergens = [];
	let lastSpoken = '';
	let lastGuidanceAt = 0;
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
		}))
		.filter((category) => category.allergens.length);

	$: appClasses = [
		'min-h-screen',
		'transition-colors',
		highContrast ? 'bg-black text-white' : 'bg-slate-50 text-slate-950',
		largeText ? 'text-xl' : 'text-base'
	].join(' ');

	onMount(async () => {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				selectedAllergens = parsed.selectedAllergens ?? [];
				highContrast = parsed.highContrast ?? true;
				largeText = parsed.largeText ?? false;
				speechEnabled = parsed.speechEnabled ?? true;
				cameraFacingMode = parsed.cameraFacingMode ?? 'environment';
				if (selectedAllergens.length > 0) mode = 'scan';
			} catch {
				localStorage.removeItem(STORAGE_KEY);
			}
		}

		await loadBackendState();
	});

	onDestroy(() => {
		stopScanning();
		if (worker) worker.terminate();
	});

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
				speechEnabled = profile.speechEnabled ?? true;
				cameraFacingMode = profile.cameraFacingMode ?? 'environment';
				if (selectedAllergens.length > 0) mode = 'scan';
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
				cameraFacingMode
			})
		);
		status = `Profiel opgeslagen met ${selectedAllergens.length} allergenen.`;
		mode = 'scan';
		speak(status);

		try {
			const response = await fetch('/api/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					selectedAllergens,
					highContrast,
					largeText,
					speechEnabled,
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

	async function startCamera() {
		if (!selectedAllergens.length) {
			status = 'Kies minimaal een allergeen voordat je scant.';
			speak(status);
			mode = 'setup';
			return;
		}

		try {
			resetScanOutput();
			await tick();
			await startCameraSession('Camera klaar. Richt op de barcode.');
		} catch (error) {
			status = 'Cameratoegang mislukt. Geef toestemming voor de camera en probeer opnieuw.';
			guidance = status;
			speak(status);
			console.error(error);
		}
	}

	async function startCameraSession(readyMessage) {
		stopScanning();
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
		scanning = true;
		status = readyMessage;
		guidance = readyMessage;
		speak(status);
		ensureBarcodeReaders();
		await ensureWorker();
		barcodeTimer = window.setInterval(analyzeBarcodeFrame, 250);
		ocrTimer = window.setInterval(analyzeTextFrame, 1500);
		analyzeFrame();
	}

	function stopScanning() {
		scanning = false;
		cameraReady = false;
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
			tessedit_char_whitelist:
				'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:()[]/%+- ',
			preserve_interword_spaces: '1'
		});
		workerReady = true;
	}

	async function analyzeFrame() {
		await analyzeBarcodeFrame();
		await analyzeTextFrame();
	}

	async function analyzeBarcodeFrame() {
		if (!video || !canvas || !cameraReady || barcodeBusy || video.videoWidth === 0 || barcodeLocked)
			return;

		const context = drawCameraFrame(960);
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

	async function analyzeTextFrame() {
		if (!video || !canvas || !cameraReady || ocrBusy || video.videoWidth === 0 || barcodeLocked)
			return;

		const context = drawCameraFrame(960);
		if (!context) return;
		const { width, height } = canvas;

		const metrics = inspectFrame(context, width, height);
		const instruction = guidanceFromMetrics(metrics);
		updateGuidance(instruction);

		if (!metrics.canAttemptOcr) return;

		ocrBusy = true;
		ocrProgress = 0;
		status = 'Labeltekst wordt gelezen.';

		try {
			const result = await worker.recognize(canvas);
			extractedText = normalizeWhitespace(result.data.text);
			const confidence = Math.round(result.data.confidence || 0);

			if (extractedText.length < 20 || confidence < 35) {
				updateGuidance(
					'Tekst is zichtbaar maar nog niet leesbaar. Houd stil en richt het label recht op de camera.'
				);
				return;
			}

			checkTextForAllergens(extractedText, 'de gelezen labeltekst');
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
		barcodeLocked = true;
		status = 'Barcode gevonden. Scanner gestopt en beeld vastgelegd.';
		guidance = status;
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
		barcodeStatus = `Barcode ${barcode} gevonden via ${source}. Deze blijft zichtbaar in de output.`;
		speak(barcodeStatus);
		await lookupProduct(barcode);
	}

	async function lookupProduct(barcode) {
		productLookupBusy = true;
		productName = '';
		productMeta = '';
		productIngredients = '';
		productStatus = 'Productinformatie wordt opgehaald.';

		try {
			const response = await fetch(`/api/products/${barcode}`);
			const data = await response.json();

			if (!response.ok || !data.found) {
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
		}
	}

	function checkTextForAllergens(text, sourceLabel) {
		const matches = findAllergenMatches(text, selectedAllergens, allergens);
		matchedAllergens = matches;

		if (matches.length) {
			const names = matches.map((match) => match.name).join(', ');
			const hasDanger = matches.some((match) => match.severity !== 'caution');
			status = hasDanger
				? `Waarschuwing. Mogelijk allergeen gevonden in ${sourceLabel}: ${names}.`
				: `Let op. Mogelijke aanwijzing gevonden in ${sourceLabel}: ${names}. Controleer het etiket extra goed.`;
			guidance = status;
		} else {
			status = `Geen gekozen allergenen gevonden in ${sourceLabel}.`;
			guidance = status;
		}

		speak(status);
	}

	function resetScanOutput() {
		detectedBarcode = '';
		barcodeLocked = false;
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

	function updateGuidance(message) {
		guidance = message;
		const now = Date.now();
		if (message !== lastSpoken && now - lastGuidanceAt > 3500) {
			lastGuidanceAt = now;
			speak(message);
		}
	}

	function speak(message) {
		lastSpoken = message;
		if (!speechEnabled || typeof speechSynthesis === 'undefined') return;
		speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(message);
		utterance.lang = 'nl-NL';
		utterance.volume = 1;
		utterance.rate = 0.95;
		// Small delay so cancel() fully flushes before the new utterance queues.
		// Also resumes in case synthesis was paused (e.g. screen lock on mobile).
		setTimeout(() => {
			if (speechSynthesis.paused) speechSynthesis.resume();
			speechSynthesis.speak(utterance);
		}, 50);
	}
</script>

<svelte:head>
	<title>Allergies Detect</title>
	<meta
		name="description"
		content="Toegankelijk prototype voor allergendetectie met camera-OCR en gesproken begeleiding."
	/>
</svelte:head>

<div class={appClasses}>
	<a
		class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-yellow-300 focus:p-3 focus:text-black"
		href="#main-content"
	>
		Ga naar de app
	</a>

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
					<h1 class="text-3xl font-bold sm:text-5xl">Allergies Detect</h1>
				</div>
				<div class="flex flex-wrap gap-2" aria-label="Toegankelijkheidsinstellingen">
					<label class="flex items-center gap-2 border border-current/30 px-3 py-2">
						<input bind:checked={highContrast} type="checkbox" />
						<span>Hoog contrast</span>
					</label>
					<label class="flex items-center gap-2 border border-current/30 px-3 py-2">
						<input bind:checked={largeText} type="checkbox" />
						<span>Grote tekst</span>
					</label>
					<label class="flex items-center gap-2 border border-current/30 px-3 py-2">
						<input bind:checked={speechEnabled} type="checkbox" />
						<span>Spraak</span>
					</label>
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
				labels, bewegingsonscherpte, onbekende talen of onvolledige ingredientenlijsten. Gebruik dit
				niet als enige veiligheidscontrole voor echte medische beslissingen.
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
					: 'bg-transparent'}"
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
								<label class="flex flex-col gap-1 font-semibold sm:hidden" for="camera-facing-mode">
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
						<p class="mt-2" aria-live="polite">
							{productLookupBusy ? 'Product wordt opgezocht...' : productStatus}
						</p>
					</section>

					<details class="border border-current/30 p-4">
						<summary id="live-status" class="cursor-pointer text-xl font-bold"
							>Technische status</summary
						>
						<p class="mt-3" aria-live="assertive">{status}</p>
						<p class="mt-2" aria-live="polite">{guidance}</p>
						<p class="mt-2">OCR-engine: {workerReady ? 'klaar' : 'niet geladen'}</p>
						<p>OCR-voortgang: {ocrProgress}%</p>
						<p>{backendStatus}</p>
					</details>
				</aside>
			</section>
		{/if}
	</main>
</div>
