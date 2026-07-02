<script>
	import "../app.css";
	import { user, initializeUserStore } from "$lib/store";
	import { onMount } from "svelte";

	onMount(() => {
		initializeUserStore();
	})
</script>

<slot />
