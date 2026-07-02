<script>
	import { user } from '$lib/store';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { writable } from 'svelte/store';

	let email = '';
	let password = '';
	let error = '';
	let isLoggedIn = false;
	let loading = false;
	let selectedAllergies = [];
	let commonAllergies = [
		'ei', 'pinda', 'boomnotenen', 'soja', 'tarwe', 'gluten', 'vis', 'schelpdieren',
		'mollusken', 'sesamzaad', 'mosterd', 'selderij', 'lupine', 'sulfiten'
	];

	async function handleLogin(event) {
		event.preventDefault();
		error = '';
		loading = true;

		if (!email || !password) {
			error = 'Vul alle velden in.';
			loading = false;
			return;
		}

		try {
			const response = await fetch(
				`http://localhost:3010/api/user/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
			);

			if (response.ok) {
				const userData = await response.json();
				user.set(userData);
				isLoggedIn = true;
				selectedAllergies = userData.allergies || [];
			} else {
				const errorMsg = await response.text();
				error = errorMsg || 'Login mislukt';
				loading = false;
			}
		} catch (err) {
			error = 'Verbindingsfout: ' + err.message;
			loading = false;
		}
	}

	async function saveAllergies() {
		loading = true;
		const currentUser = get(user);

		try {
			const response = await fetch(
				`http://localhost:3010/api/user/${currentUser.id}?email=${encodeURIComponent(currentUser.email)}&password=${encodeURIComponent(currentUser.password)}`,
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ allergies: selectedAllergies })
				}
			);

			if (response.ok) {
				const updatedUser = await response.json();
				user.set(updatedUser);
				error = '';
				setTimeout(() => {
					goto('/');
				}, 500);
			} else {
				error = 'Allergieën opslaan mislukt';
				loading = false;
			}
		} catch (err) {
			error = 'Verbindingsfout: ' + err.message;
			loading = false;
		}
	}

	function toggleAllergy(allergen) {
		if (selectedAllergies.includes(allergen)) {
			selectedAllergies = selectedAllergies.filter(a => a !== allergen);
		} else {
			selectedAllergies = [...selectedAllergies, allergen];
		}
	}

	function logout() {
		isLoggedIn = false;
		email = '';
		password = '';
		selectedAllergies = [];
		error = '';
		user.set(null);
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-100 p-4">
	{#if !isLoggedIn}
		<!-- Login Form -->
		<div class="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
			<h2 class="mb-6 text-center text-3xl font-bold text-gray-800">Inloggen</h2>

			<form on:submit={handleLogin} class="space-y-5">
				<div>
					<label for="email" class="mb-2 block text-sm font-medium text-gray-700">
						E-mailadres
					</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						placeholder="voorbeeld@mail.com"
						class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
					/>
				</div>

				<div>
					<label for="password" class="mb-2 block text-sm font-medium text-gray-700">
						Wachtwoord
					</label>
					<input
						type="password"
						id="password"
						bind:value={password}
						placeholder="Typ hier je wachtwoord"
						class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
					/>
				</div>

				{#if error}
					<p class="text-sm text-red-500">{error}</p>
				{/if}

				<button
					type="submit"
					disabled={loading}
					class="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
				>
					{loading ? 'Bezig met inloggen...' : 'Inloggen'}
				</button>
			</form>
		</div>
	{:else}
		<!-- Allergies Selection Form -->
		<div class="w-full max-w-2xl rounded-xl bg-white p-8 shadow-lg">
			<h2 class="mb-2 text-center text-3xl font-bold text-gray-800">Mijn allergieën</h2>
			<p class="mb-6 text-center text-gray-600">
				Selecteer je allergieën of voorkeurcombinaties om opgeslagen te houden
			</p>

			<form on:submit|preventDefault={saveAllergies} class="space-y-6">
				<div class="grid grid-cols-2 gap-4 md:grid-cols-3">
					{#each commonAllergies as allergen (allergen)}
						<label class="flex items-center space-x-3 rounded-lg border border-gray-300 p-3 hover:bg-gray-50">
							<input
								type="checkbox"
								checked={selectedAllergies.includes(allergen)}
								on:change={() => toggleAllergy(allergen)}
								class="h-4 w-4 rounded border-gray-300"
							/>
							<span class="text-sm font-medium text-gray-700">{allergen}</span>
						</label>
					{/each}
				</div>

				{#if error}
					<p class="text-sm text-red-500">{error}</p>
				{/if}

				<div class="flex gap-4">
					<button
						type="submit"
						disabled={loading}
						class="flex-1 rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
					>
						{loading ? 'Bezig met opslaan...' : 'Opslaan & Doorgaan'}
					</button>
					<button
						type="button"
						on:click={logout}
						class="flex-1 rounded-lg border border-gray-300 bg-white py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
					>
						Afmelden
					</button>
				</div>
			</form>
		</div>
	{/if}
</div>