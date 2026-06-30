const { CloudWatchLogsClient, FilterLogEventsCommand } = require("@aws-sdk/client-cloudwatch-logs");
const fs = require('fs');

async function getLogs() {
    const logGroupName = fs.readFileSync('logGroupName.txt', 'utf8').trim();
    console.log("Log Group:", logGroupName);
    
    const client = new CloudWatchLogsClient({ region: "us-east-1" });
    const startTime = new Date(Date.now() - 30 * 60 * 1000).getTime(); // Last 30 mins
    
    const command = new FilterLogEventsCommand({
        logGroupName,
        startTime,
    });

    try {
        const response = await client.send(command);
        if (response.events && response.events.length > 0) {
            response.events.forEach(e => {
                console.log(e.message);
            });
        } else {
            console.log("No logs found in the last 30 minutes.");
        }
    } catch (e) {
        console.error("Error fetching logs:", e);
    }
}

getLogs();
