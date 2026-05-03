const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());

const FIREBASE_URL = 'https://agriknows-data-default-rtdb.asia-southeast1.firebasedatabase.app';
const FIREBASE_SECRET = 'dfMAPU9mohsRupxSlRz6v77a1Ou9sJST3BodYO79';

app.post('/receive_data', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const rawData = req.body;
    const { temperature, humidity, soilMoisture, pH, light, deviceId } = rawData;

    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).replace(/(\d+)\/(\d+)\/(\d+),?/, '$3-$1-$2');

    console.log('Received:', rawData);

    let user_id = 'unassigned';
    if (deviceId) {
      const deviceResponse = await fetch(
        `${FIREBASE_URL}/devices/${deviceId}.json?auth=${FIREBASE_SECRET}`
      );
      const deviceData = await deviceResponse.json();
      if (deviceData && deviceData.assignedTo) {
        user_id = deviceData.assignedTo;
      }
    }

    const firebasePayload = {
      temperature: temperature || 0,
      humidity: humidity || 0,
      soilMoisture: soilMoisture || 0,
      pH: pH || 0,
      light: light || 'DARK',
      timestamp,
      deviceId: deviceId || 'unknown',
      user_id
    };

    const firebaseResponse = await fetch(
      `${FIREBASE_URL}/sensorData.json?auth=${FIREBASE_SECRET}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firebasePayload)
      }
    );

    const firebaseResult = await firebaseResponse.json();

    if (firebaseResponse.ok) {
      res.status(200).json({ status: 'success', server_time: timestamp, user_id, firebase_result: firebaseResult });
    } else {
      res.status(500).json({ status: 'error', firebase_error: firebaseResult });
    }

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.options('/receive_data', (req, res) => res.status(200).end());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));