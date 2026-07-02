import { writable } from 'svelte/store';

export function initializeUserStore() {
    const storedUser = sessionStorage.getItem("user");
    if (storedUser) {
        user.set(JSON.parse(storedUser));
    }
    user.subscribe((value) => {
        console.log("storedUser:", value);
        sessionStorage.setItem("user", value ? JSON.stringify(value) : null);
    });
}

export const user = writable(null);

