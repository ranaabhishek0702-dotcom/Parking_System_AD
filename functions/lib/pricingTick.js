"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingTick = exports.pricingTickScheduled = void 0;
exports.executePricingTick = executePricingTick;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const shared_1 = require("@parksense/shared");
const firebase_js_1 = require("./firebase.js");
/**
 * Core pricing update execution logic shared between scheduler and HTTP triggers
 */
async function executePricingTick() {
    const now = Date.now();
    const serverTimestamp = firestore_1.FieldValue.serverTimestamp();
    // 1. Fetch live zone occupancy states from RTDB
    const liveZonesSnap = await firebase_js_1.rtdb.ref('live_zones').get();
    if (!liveZonesSnap.exists()) {
        console.warn('No live_zones found in RTDB');
        return { updatedZonesCount: 0, results: {} };
    }
    const liveZones = liveZonesSnap.val();
    const results = {};
    // Batch writes for Firestore price_history
    const historyBatch = firebase_js_1.firestore.batch();
    for (const [zoneId, zoneLive] of Object.entries(liveZones)) {
        // 2. Fetch zone configuration from Firestore
        const zoneDoc = await firebase_js_1.firestore.collection('zones').doc(zoneId).get();
        const zoneData = zoneDoc.data() || {};
        const baseHourlyRate = zoneData.baseHourlyRate || 40;
        const zoneType = (zoneData.type || 'market');
        const currentOccupancy = zoneLive.occupancyRate ?? 0;
        const previousRate = zoneLive.currentRatePerHour ?? baseHourlyRate;
        // 3. Fetch recent historical snapshots to compute 45-min forecast lookahead
        let forecastOccupancy45Min = currentOccupancy;
        try {
            const historySnap = await firebase_js_1.firestore
                .collection('price_history')
                .where('zoneId', '==', zoneId)
                .orderBy('calculatedAt', 'desc')
                .limit(48)
                .get();
            if (!historySnap.empty && historySnap.size >= 12) {
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
                // Compute 1-hour ahead forecast
                const forecastResult = (0, shared_1.computeForecast)(zoneId, zoneType, historyPoints, 2);
                if (forecastResult.forecasts.length > 0) {
                    forecastOccupancy45Min = forecastResult.forecasts[0].forecastedOccupancy;
                }
            }
        }
        catch (err) {
            console.warn(`Could not compute forecast for ${zoneId}, falling back to current occupancy:`, err.message);
        }
        // 4. Run the Pure Pricing Engine
        const pricingResult = (0, shared_1.calculateDynamicPrice)({
            zoneId,
            zoneType,
            baseHourlyRate,
            currentOccupancyRate: currentOccupancy,
            forecastOccupancy45Min,
            previousEffectiveRate: previousRate,
            timestamp: now
        });
        results[zoneId] = pricingResult;
        // 5. Update RTDB Live State for sub-second client reads
        await firebase_js_1.rtdb.ref(`live_zones/${zoneId}`).update({
            currentRatePerHour: pricingResult.effectiveRate,
            demandIndex: pricingResult.demandIndex,
            pricingReason: pricingResult.humanReason,
            guardrailsFired: pricingResult.guardrailsFired,
            proactiveSurge: pricingResult.proactiveAdjustmentApplied,
            lastPricingUpdate: now
        });
        // 6. Write detailed audit record to Firestore /price_history
        const historyId = `hist_${zoneId}_${now}`;
        const historyRef = firebase_js_1.firestore.collection('price_history').doc(historyId);
        historyBatch.set(historyRef, {
            id: historyId,
            zoneId,
            effectiveRate: pricingResult.effectiveRate,
            demandIndex: pricingResult.demandIndex,
            occupancyRate: currentOccupancy,
            forecastOccupancy45Min,
            breakdown: pricingResult.breakdown,
            guardrailsFired: pricingResult.guardrailsFired,
            exemptionsApplied: pricingResult.exemptionsApplied,
            proactiveAdjustmentApplied: pricingResult.proactiveAdjustmentApplied,
            humanReason: pricingResult.humanReason,
            calculatedAt: serverTimestamp
        });
    }
    await historyBatch.commit();
    return {
        updatedZonesCount: Object.keys(results).length,
        results
    };
}
/**
 * 5-Minute Cron Schedule Trigger
 */
exports.pricingTickScheduled = (0, scheduler_1.onSchedule)({
    schedule: 'every 5 minutes',
    timeZone: 'Asia/Kolkata',
    region: 'us-central1'
}, async () => {
    console.log('⏰ Running scheduled pricingTick...');
    const result = await executePricingTick();
    console.log(`✅ Updated dynamic tariffs for ${result.updatedZonesCount} zones.`);
});
/**
 * HTTP Webhook / On-Demand Trigger (for local dev, tests, and manual sync)
 */
exports.pricingTick = (0, https_1.onRequest)({
    cors: true,
    region: 'us-central1'
}, async (req, res) => {
    try {
        const outcome = await executePricingTick();
        res.status(200).json({
            status: 'success',
            message: `Successfully executed dynamic pricing evaluation for ${outcome.updatedZonesCount} zones`,
            data: outcome.results,
            timestamp: Date.now()
        });
    }
    catch (err) {
        console.error('Error executing pricingTick:', err);
        res.status(500).json({
            error: 'Pricing Tick Failed',
            message: err.message
        });
    }
});
//# sourceMappingURL=pricingTick.js.map