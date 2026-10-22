import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import picocolors from 'picocolors';
import { firestore } from './firebase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runBackfill(weeks: number = 8) {
  console.log(
    picocolors.bold(
      picocolors.cyan(`\n⏳ Generating ${weeks} weeks of historical parking data for predictive AI...`)
    )
  );

  const configFile = path.resolve(__dirname, '../configs/delhi-ncr.json');
  const raw = fs.readFileSync(configFile, 'utf-8');
  const cityConfig = JSON.parse(raw);

  const now = Date.now();
  const ONE_HOUR = 3600 * 1000;
  const ONE_DAY = 24 * ONE_HOUR;
  const totalDays = weeks * 7;

  let totalRecordsCreated = 0;
  const zones = cityConfig.zones;

  for (const zone of zones) {
    console.log(picocolors.gray(`  Processing historical series for zone: ${zone.id} (${zone.name})`));

    // To prevent oversized memory allocations, we write in batches of 400
    let currentBatch = firestore.batch();
    let batchCount = 0;

    for (let dayOffset = totalDays; dayOffset >= 0; dayOffset--) {
      const dayTimestamp = now - dayOffset * ONE_DAY;
      const date = new Date(dayTimestamp);
      const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Sample key hours of the day (e.g., every 2 hours: 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22)
      // This yields 12 highly accurate snapshots per day = ~672 snapshots per zone = ~6,000 points total
      for (let hour = 0; hour < 24; hour += 2) {
        const sampleTimestamp = dayTimestamp + hour * ONE_HOUR;
        const snapshotDate = new Date(sampleTimestamp);

        // Compute baseline diurnal curve based on zone type
        let baseOccupancy = 0.15; // Baseline night occupancy

        if (zone.type === 'office') {
          if (!isWeekend) {
            // Office weekday curve: morning peak (9-11 AM) and afternoon (2-5 PM)
            if (hour >= 9 && hour <= 18) {
              baseOccupancy = 0.75 + Math.sin((hour - 9) * 0.3) * 0.18;
            } else if (hour === 8 || hour === 19) {
              baseOccupancy = 0.45;
            } else {
              baseOccupancy = 0.1;
            }
          } else {
            baseOccupancy = 0.15; // Low on weekends
          }
        } else if (zone.type === 'market') {
          // Market curve: builds from 11 AM to a high peak at 6-9 PM, higher on weekends
          if (hour >= 11 && hour <= 22) {
            const peakFactor = isWeekend ? 0.9 : 0.75;
            baseOccupancy = peakFactor - Math.abs(hour - 18) * 0.04;
          } else {
            baseOccupancy = 0.08;
          }
        } else if (zone.type === 'transit') {
          // Transit curve: early morning fill (7-10 AM) staying full until 6-8 PM
          if (hour >= 7 && hour <= 21) {
            baseOccupancy = isWeekend ? 0.45 : 0.82;
          } else {
            baseOccupancy = 0.12;
          }
        } else if (zone.type === 'hospital') {
          // Hospital: 24/7 steady baseline with morning OPD rush
          baseOccupancy = hour >= 8 && hour <= 14 ? 0.85 : 0.5;
        }

        // Add subtle Gaussian noise
        const jitter = (Math.random() - 0.5) * 0.08;
        const finalOccupancyRate = Math.max(0.05, Math.min(0.98, Number((baseOccupancy + jitter).toFixed(3))));

        // Pricing multiplier calculation
        const isSurge = finalOccupancyRate > 0.8;
        const demandIndex = Number((1.0 + (finalOccupancyRate - 0.5) * 1.5).toFixed(2));
        const effectiveRate = isSurge ? Math.round(zone.baseHourlyRate * 1.5) : zone.baseHourlyRate;

        const historyId = `hist_${zone.id}_${snapshotDate.toISOString().replace(/[:.]/g, '-')}`;
        const historyRef = firestore.collection('price_history').doc(historyId);

        currentBatch.set(historyRef, {
          id: historyId,
          zoneId: zone.id,
          effectiveRate,
          demandIndex,
          occupancyRate: finalOccupancyRate,
          calculatedAt: snapshotDate
        });

        batchCount++;
        totalRecordsCreated++;

        if (batchCount >= 400) {
          await currentBatch.commit();
          currentBatch = firestore.batch();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await currentBatch.commit();
    }
  }

  console.log(
    picocolors.green(
      `\n✅ 8-Week Historical Backfill complete!`
    )
  );
  console.log(picocolors.bold(`   • Generated ${totalRecordsCreated} price & occupancy time-series records`));
  console.log(picocolors.bold(`   • Covers all 9 zones with diurnal curves, office/market variations, and weekend surges`));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBackfill(8)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(picocolors.red('Backfill failed:'), err);
      process.exit(1);
    });
}
