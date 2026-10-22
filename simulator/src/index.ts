import { Command } from 'commander';
import picocolors from 'picocolors';
import { SimulationEngine } from './engine.js';

const program = new Command();

program
  .name('parksense-simulator')
  .description('ParkSense Real-Time Urban Street-Parking Telemetry Simulator')
  .version('1.0.0')
  .option('-s, --speed <speed>', 'Simulation speed: 1x, 10x, 60x', '10x')
  .option(
    '-c, --scenario <scenario>',
    'Scenario preset: normal-weekday, ipl-match-night, diwali-shopping-rush, monsoon-deluge, illegal-parking-surge',
    'normal-weekday'
  )
  .option('-r, --seed <seed>', 'Reproducible seed for PRNG', 'parksense-2026-delhi')
  .option('--city <path>', 'Custom city configuration JSON file')
  .action(async (options) => {
    try {
      const engine = new SimulationEngine({
        speed: options.speed as any,
        scenario: options.scenario,
        seed: options.seed,
        cityConfigPath: options.city
      });

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log(picocolors.yellow('\nReceived SIGINT. Shutting down gracefully...'));
        engine.stop();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        console.log(picocolors.yellow('\nReceived SIGTERM. Shutting down gracefully...'));
        engine.stop();
        process.exit(0);
      });

      await engine.initialize();
      await engine.start();
    } catch (err: any) {
      console.error(picocolors.red('Simulator encountered a fatal error:'), err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
