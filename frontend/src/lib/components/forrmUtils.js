import { goto } from "$app/navigation";
import { user } from "$lib/store";

/*export function areFieldsFilled(fields) {
    const keys = Object.keys(fields);
    let check = true;
    keys.forEach(key => { if (fields[key].value === "") { check = false; } })
    return check;
}

export function assignUserInputToFields(fields) {
    let newFields = fields;
    Object.keys(newFields).forEach(key => {
        newFields[key].value = document.getElementById(key).value;
    });
    return newFields;
}*/

export async function communicateWithApi(url, callMethod, redirect = '/') {
    let succesful = true;
    try {
        const res = await fetch(url, {method: callMethod});
        let data = await res.json();
        user.set(data);
        goto(redirect);
    } catch (err) {
        succesful = false;
    }
    return succesful;
}