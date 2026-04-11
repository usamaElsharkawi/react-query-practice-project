export async function fetchEvents(searchTerm) {
    let url = 'http://localhost:3000/events';
    if(searchTerm){
        url += `?search=${searchTerm}`;
    }
    const response = await fetch(url);
    
    if(!response.ok){
        const error = new Error("Failed to fetch events");
        error.code = response.status;
        error.info = await response.json()
        throw error;
    }

    const {events} = await response.json();
    return events;
}