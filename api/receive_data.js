const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawData = req.body;
    const timestamp = new Date().toLocaleString('en-US', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/(\d+)\/(\d+)\/(\d+),?/, '$3-$1-$2');

    console.log('Received data:', rawData);
    console.log('Server timestamp:', timestamp);

    // Extract values from Arduino
    const { temperature, humidity, soilMoisture, pH, light, timestamp: arduinoTimestamp } = rawData;

    // --- Firebase Configuration ---
    const FIREBASE_URL = 'https://agriknows-data-default-rtdb.asia-southeast1.firebasedatabase.app';
    const FIREBASE_SECRET = 'dfMAPU9mohsRupxSlRz6v77a1Ou9sJST3BodYO79';

    // Data to send to Firebase
    const firebasePayload = {
      temperature: temperature || 0,
      humidity: humidity || 0,
      soilMoisture: soilMoisture || 0,
      pH: pH || 0,
      light: light || 'DARK',
      timestamp: timestamp
    };

    // Send to Firebase
    const firebaseResponse = await fetch(
      `${FIREBASE_URL}/sensorData.json?auth=${FIREBASE_SECRET}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(firebasePayload),
      }
    );

    const firebaseResult = await firebaseResponse.json();

    if (firebaseResponse.ok) {
      // Success response
      res.status(200).json({
        status: 'success',
        message: 'Data received and sent to Firebase',
        server_time: timestamp,
        firebase_result: firebaseResult
      });
    } else {
      // Firebase error
      res.status(500).json({
        status: 'error',
        message: 'Failed to send to Firebase',
        firebase_error: firebaseResult
      });
    }

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
};
