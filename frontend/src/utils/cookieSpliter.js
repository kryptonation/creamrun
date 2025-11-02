export const cookieSpliter=(spec)=>{
    let keyValuePairs = document.cookie.split(";");

// Create an object to hold the parsed data
let obj = {};

// Iterate over each key-value pair
keyValuePairs.forEach(pair => {
    let [key, value] = pair.split("=").map(item => item.trim()); // Split by '=' and remove extra spaces
    obj[key] = value; // Assign to object
});
return obj?.[spec]

}