"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshForecasts = exports.refreshForecastsScheduled = void 0;
exports.executeForecastRefresh = executeForecastRefresh;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const shared_1 = require("@parksense/shared");
const firebase_js_1 = require("./firebase.js");
async function executeForecastRefresh() {
    const zonesSnapshot = await firebase_js_1.firestore.collection('zones').get();
    const refreshedZones = [];
    const summary = {};
    for (const zoneDoc of zonesSnapshot.docs) {
        const zoneId = zoneDoc.id;
        const zoneData = zoneDoc.data();
        const zoneType = (zoneData.type || 'market');
        // Fetch up to 14 days of historical hourly records
        const historySnap = await firebase_js_1.firestore
            .collection('price_history')
            .where('zoneId', '==', zoneId)
            .orderBy('calculatedAt', 'desc')
            .limit(336)
            .get();
        if (historySnap.size < 24) {
            console.warn(`Zone ${zoneId} has fewer than 24 historical points, skipping forecast refresh.`);
            continue;
        }
        const historyPoints = historySnap.docs.map((doc) => {
            const d = doc.data();
            const ts = d.calculatedAt?.toMillis ? d.calculatedAt.toMillis() : Date.now();
            const dt = new Date(ts);
            return {
                timestamp: ts,
                occupancyRate: d.occupancyRate ?? 0.5,
                hourOfWeek: (dt.getDay() * 24 + dt.getHours()) % 168,
                dayOfWeek: dt.getDay(),
                hourOfDay: dt.getHours()
            };
        });
        // Compute 24h and 7d (168h) forecasts
        const forecast24h = (0, shared_1.computeForecast)(zoneId, zoneType, historyPoints, 24);
        const forecast7d = (0, shared_1.computeForecast)(zoneId, zoneType, historyPoints, 168);
        // Save cached forecasts to Firestore /forecasts/{zoneId}
        await firebase_js_1.firestore.collection('forecasts').doc(zoneId).set({
            zoneId,
            zoneName: zoneData.name || zoneId,
            zoneType,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            backtestMape: forecast24h.backtestMape,
            naiveMape: forecast24h.naiveMape,
            modelBeatsNaive: forecast24h.modelBeatsNaive,
            forecast24h: forecast24h.forecasts,
            forecast7d: forecast7d.forecasts.filter((_, idx) => idx % 3 === 0) // sample every 3 hours for storage efficiency
        });
        refreshedZones.push(zoneId);
        summary[zoneId] = {
            backtestMape: forecast24h.backtestMape,
            naiveMape: forecast24h.naiveMape,
            pointsCount: forecast24h.forecasts.length
        };
    }
    return { refreshedZones, summary };
}
exports.refreshForecastsScheduled = (0, scheduler_1.onSchedule)({
    schedule: 'every 6 hours',
    timeZone: 'Asia/Kolkata',
    region: 'us-central1'
}, async () => {
    console.log('⏰ Refreshing parking occupancy forecasts across all municipal zones...');
    const result = await executeForecastRefresh();
    console.log(`✅ Refreshed forecasts for ${result.refreshedZones.length} zones.`);
});
exports.refreshForecasts = (0, https_1.onRequest)({
    cors: true,
    region: 'us-central1'
}, async (req, res) => {
    try {
        const result = await executeForecastRefresh();
        res.status(200).json({
            status: 'success',
            message: `Successfully refreshed forecasts for ${result.refreshedZones.length} zones`,
            data: result.summary,
            timestamp: Date.now()
        });
    }
    catch (err) {
        console.error('Error refreshing forecasts:', err);
        res.status(500).json({
            error: 'Forecast Refresh Failed',
            message: err.message
        });
    }
});
//# sourceMappingURL=refreshForecasts.js.map