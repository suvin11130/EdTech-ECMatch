import 'dotenv/config'; 
import axios from 'axios';
import fs from 'fs';

function initializeSpreadsheet() {
    const headers = 'Activity Name,Description,Type,Interest,State,Grade\n';
    fs.writeFileSync('scraped_data.csv', headers, 'utf-8');
    console.log('📊 Spreadsheet initialized: scraped_data.csv created!');
}

async function fetchFromDatabase() {
    initializeSpreadsheet();
    
    const apiUrl = 'https://typesense.extracurriculars.org/multi_search?x-typesense-api-key=L9EJr1spJTxXQ7zEpN22t64YIForeUiX';
    
    let currentPage = 1;
    let keepGoing = true;
    let totalScraped = 0;

    console.log('🛰️ Connecting directly to the database API...');

    while (keepGoing) {
        console.log(`📥 Downloading batch from Page ${currentPage}...`);

        const requestData = {
            searches: [
                {
                    collection: 'extracurriculars', 
                    q: '*', 
                    query_by: 'title,description,type,interest,state,grade',
                    per_page: 250, 
                    page: currentPage
                }
            ]
        };

        try {
            const response = await axios.post(apiUrl, requestData, {
                headers: { 'Content-Type': 'application/json' }
            });

            const hits = response.data.results[0]?.hits || [];

            if (hits.length === 0) {
                console.log('\n🏁 Reached the end of the database.');
                keepGoing = false;
                break;
            }

            for (let hit of hits) {
                const doc = hit.document;
                
                // Helper function to safely convert arrays/numbers to string and strip double quotes
                const cleanField = (field) => {
                    if (field === undefined || field === null) return 'N/A';
                    // Convert arrays like ["Sports", "Music"] into a single string "Sports; Music"
                    if (Array.isArray(field)) return field.join('; ').replace(/"/g, '""').trim();
                    return field.toString().replace(/"/g, '""').replace(/\n/g, ' ').trim();
                };

                // Extract all fields safely using the helper function
                const title = cleanField(doc.title || doc.name);
                const description = cleanField(doc.description);
                const type = cleanField(doc.type);
                const interest = cleanField(doc.interest);
                const state = cleanField(doc.state);
                const grade = cleanField(doc.grade);

                const csvRow = `"${title}","${description}","${type}","${interest}","${state}","${grade}"\n`;
                fs.appendFileSync('scraped_data.csv', csvRow, 'utf-8');
            }

            totalScraped += hits.length;
            console.log(`✨ Saved ${hits.length} activities from this batch. (Running Total: ${totalScraped})`);
            
            currentPage++;

            // Short pause to be polite to the server
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.error('❌ Failed to retrieve data from API:', error.message);
            keepGoing = false; 
        }
    }

    console.log(`\n🎉 Completed! Successfully compiled ${totalScraped} individual extracurriculars into "scraped_data.csv".`);
}

fetchFromDatabase();