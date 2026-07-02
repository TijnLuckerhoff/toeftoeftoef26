<script>
	import { onMount } from "svelte";
	import Pet from "./Pet.svelte";

    let allPetsData = [];
    let allCatsData =[];

    const getData = async (url) => {
        try {
            const res = await fetch(url);
            const data = await res.json();
            return data;
        } catch (err) {
            throw new Error(err);
        }
    }

    const getDataArray = async (urls) => {
        try {
            const dataArray = await Promise.all(urls.map((url) => { return getData(url) }));
            return dataArray;
        } catch (err) {
            throw new Error(err);
        }
    }
    
    onMount(async () => {
        // get the pet uris {"pets/1", "pets/2"...}
        const petUris = await getData('http://localhost:3010/pets');
        const allPetsUrls = petUris.map((peturi) => { return `http://localhost:3010${peturi}` });
        allPetsData = await Promise.all(allPetsUrls.map((petUrl) => { return getData(petUrl) }));
        allCatsData = allPetsData.filter((pet) => { if (pet.type === "Cat") { return true; } });
    });
    
</script>

<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
    {#each allCatsData as cat}
        <Pet pet={cat}/>
    {/each}
</div>