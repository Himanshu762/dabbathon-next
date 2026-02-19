'use server';

export async function fetchGoogleSheetCsv(url: string) {
    try {
        // Basic validation
        if (!url.includes('docs.google.com/spreadsheets')) {
            return { error: 'Invalid Google Sheet URL. Must be a Google Sheet link.' };
        }

        // Extract Sheet ID
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
            return { error: 'Could not parse Sheet ID from URL.' };
        }
        const sheetId = match[1];

        // Construct CSV Export URL
        // Note: We blindly export the first sheet (gid=0 usually) or the default.
        // If the user provided a link with `gid=...`, we could try to preserve it, 
        // but standard /export?format=csv usually exports the first visible sheet.
        let csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

        // Check for gid in the input URL to export specific tab
        const gidMatch = url.match(/[?&]gid=([0-9]+)/);
        if (gidMatch) {
            csvUrl += `&gid=${gidMatch[1]}`;
        }

        const response = await fetch(csvUrl, { cache: 'no-store' });
        if (!response.ok) {
            return { error: `Failed to fetch CSV from Google (Status: ${response.status}). Ensure the sheet is "Anyone with the link can view".` };
        }

        const text = await response.text();
        return { success: true, csv: text };
    } catch (error) {
        console.error('Google Sheet Import Error:', error);
        return { error: 'Internal Server Error while fetching sheet.' };
    }
}
