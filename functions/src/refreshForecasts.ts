import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { computeForecast, type HourlyDataPoint, type ZoneType } from '@parksense/shared';

if (!admin.apps.length) {
  admin.initializeApp();
}

const firestore = admin.firestore();

export async function executeForecastRefresh(): Promise<{
  refreshedZones: string[];
  summary: Record<string, any>;
}> {
  const zonesSnapshot = await firestore.collection('zones').get();
  const refreshedZones: string[] = [];
  const summary: Record<string, any> = {};

  for (const zoneDoc of zonesSnapshot.docs) {
    const zoneId = zoneDoc.id;
    const zoneData = zoneDoc.data();
    const zoneType = (zoneData.type || 'market') as ZoneType;

    // Fetch up to 14 days of historical hourly records
    const historySnap = await firestore
      .collection('price_history')
      .where('zoneId', '==', zoneId)
      .orderBy('calculatedAt', 'desc')
      .limit(336)
      .get();

    if (historySnap.size < 24) {
      console.warn(`Zone ${zoneId} has fewer than 24 historical points, skipping forecast refresh.`);
      continue;
    }

    const historyPoints: HourlyDataPoint[] = historySnap.docs.map((doc) => {
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
    const forecast24h = computeForecast(zoneId, zoneType, historyPoints, 24);
    const forecast7d = computeForecast(zoneId, zoneType, historyPoints, 168);

    // Save cached forecasts to Firestore /forecasts/{zoneId}
    await firestore.collection('forecasts').doc(zoneId).set({
      zoneId,
      zoneName: zoneData.name || zoneId,
      zoneType,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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

export const refreshForecastsScheduled = onSchedule(
  {
    schedule: 'every 6 hours',
    timeZone: 'Asia/Kolkata',
    region: 'us-central1'
  },
  async () => {
    console.log('⏰ Refreshing parking occupancy forecasts across all municipal zones...');
    const result = await executeForecastRefresh();
    console.log(`✅ Refreshed forecasts for ${result.refreshedZones.length} zones.`);
  }
);

export const refreshForecasts = onRequest(
  {
    cors: true,
    region: 'us-central1'
  },
  async (req, res) => {
    try {
      const result = await executeForecastRefresh();
      res.status(200).json({
        status: 'success',
        message: `Successfully refreshed forecasts for ${result.refreshedZones.length} zones`,
        data: result.summary,
        timestamp: Date.now()
      });
    } catch (err: any) {
      console.error('Error refreshing forecasts:', err);
      res.status(500).json({
        error: 'Forecast Refresh Failed',
        message: err.message
      });
    }
  }
);
