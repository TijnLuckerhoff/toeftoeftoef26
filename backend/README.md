# Allergies Detect API

Small Express backend for the Allergies Detect prototype.

## Run

```bash
npm install
npm run dev
```

The server runs on `localhost:3010` by default.

## Endpoints

- `GET /api/allergens` returns the fixed prototype allergen catalog with synonyms.
- `GET /api/profile` returns the saved default allergen profile.
- `PUT /api/profile` saves the selected allergens and accessibility settings.
- `POST /api/scan-text` checks OCR text against selected allergens.

OCR still runs in the browser with Tesseract.js. The backend never calls paid AI vision APIs and does not need uploaded camera images.
