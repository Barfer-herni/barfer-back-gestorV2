import { connect } from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

async function run() {
  try {
    const conn = await connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/barfer');
    const collection = conn.connection.collection('orders');
    
    const pipeline = [
      { $match: { status: { $in: ['confirmed', 'delivered'] } } },
      { $unwind: '$items' },
      { $unwind: '$items.options' },
      {
        $addFields: {
          category: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: '$items.name', regex: /big dog/i } }, then: 'BIG DOG' },
                { case: { $regexMatch: { input: '$items.name', regex: /huesos/i } }, then: 'HUESOS CARNOSOS' },
                { case: { $regexMatch: { input: '$items.name', regex: /complement/i } }, then: 'COMPLEMENTOS' },
                { case: { $regexMatch: { input: '$items.name', regex: /perro/i } }, then: 'PERRO' },
                { case: { $regexMatch: { input: '$items.name', regex: /gato/i } }, then: 'GATO' },
              ],
              default: 'OTROS',
            },
          },
        },
      },
      {
        $match: {
          category: { $in: ['BIG DOG', 'PERRO', 'GATO', 'HUESOS CARNOSOS', 'COMPLEMENTOS'] },
        },
      },
      {
        $group: {
          _id: '$category',
          uniqueProducts: { 
            $addToSet: { 
              $concat: [
                { $toUpper: '$items.name' }, 
                "-", 
                { $toUpper: { $ifNull: ['$items.options.name', ''] } }
              ] 
            } 
          }
        }
      }
    ];

    const results = await collection.aggregate(pipeline).toArray();
    for (const r of results) {
      console.log(`\n=== ${r._id} : ${r.uniqueProducts.length} unique ===`);
      r.uniqueProducts.sort().forEach((p: string) => console.log(p));
    }
    
    // Check raw items
    const sampleOrders = await collection.find({ status: { $in: ['confirmed', 'delivered'] } }).limit(2).toArray();
    console.log('\n=== SAMPLE ORDERS ===');
    console.log(JSON.stringify(sampleOrders.map(o => o.items), null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
