const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

    const { temperature, humidity, soilMoisture, pH, light, deviceId, timestamp: arduinoTimestamp } = rawData;

    const FIREBASE_URL = 'https://agriknows-data-default-rtdb.asia-southeast1.firebasedatabase.app';
    const FIREBASE_SECRET = 'dfMAPU9mohsRupxSlRz6v77a1Ou9sJST3BodYO79';

    // ── DEVICE LOOKUP: get user_id from deviceId ──
    let user_id = 'unassigned';

    if (deviceId) {
      const deviceResponse = await fetch(
        `${FIREBASE_URL}/devices/${deviceId}.json?auth=${FIREBASE_SECRET}`
      );
      const deviceData = await deviceResponse.json();

      if (deviceData && deviceData.assignedTo) {
        user_id = deviceData.assignedTo;
        console.log(`Device ${deviceId} → user_id: ${user_id}`);
      } else {
        console.log(`Device ${deviceId} not assigned to any user`);
      }
    }

    const firebasePayload = {
      temperature: temperature || 0,
      humidity: humidity || 0,
      soilMoisture: soilMoisture || 0,
      pH: pH || 0,
      light: light || 'DARK',
      timestamp: timestamp,
      deviceId: deviceId || 'unknown',
      user_id: user_id  // ← now correctly set from device lookup
    };

    const firebaseResponse = await fetch(
      `${FIREBASE_URL}/sensorData.json?auth=${FIREBASE_SECRET}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firebasePayload),
      }
    );

    const firebaseResult = await firebaseResponse.json();

    if (firebaseResponse.ok) {
      res.status(200).json({
        status: 'success',
        message: 'Data received and sent to Firebase',
        server_time: timestamp,
        user_id: user_id,
        firebase_result: firebaseResult
      });
    } else {
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
