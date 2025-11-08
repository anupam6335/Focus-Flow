// Add this debug function and call it in loadQuestions
function debugAPIResponse(response) {
    console.group('API Response Debug');
    console.log('Response OK:', response.ok);
    console.log('Response Data:', response.data);
    console.log('Response Data Type:', typeof response.data);
    console.log('Is Array:', Array.isArray(response.data));
    if (response.data && typeof response.data === 'object') {
        console.log('Response Data Keys:', Object.keys(response.data));
    }
    console.groupEnd();
}

function debugState() {
    console.group('Current Application State');
    console.log('isLoggedIn:', state.isLoggedIn);
    console.log('questions count:', state.questions.length);
    console.log('questions:', state.questions);
    console.log('currentDay:', state.currentDay);
    console.groupEnd();
}

// Call this in loadQuestions after setting state
// Add: debugState();